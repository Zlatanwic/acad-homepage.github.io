import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const compiled = await build({
  entryPoints: [resolve(here, '../../assets/js/src/scene.js')],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node'
});

function createMockGL(stats) {
  let id = 0;
  return {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88e4,
    FLOAT: 0x1406,
    TRIANGLES: 0x0004,
    LINES: 0x0001,
    POINTS: 0x0000,
    DEPTH_BUFFER_BIT: 0x0100,
    DEPTH_TEST: 0x0b71,
    BLEND: 0x0be2,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    createShader: () => ({ id: ++id }),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => !stats.shaderFailure,
    getShaderInfoLog: () => 'Mock shader error',
    deleteShader: () => {},
    createProgram: () => { stats.programsCreated += 1; return { id: ++id }; },
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    getProgramInfoLog: () => '',
    deleteProgram: () => { stats.programsDeleted += 1; },
    getAttribLocation: (_, name) => name.length,
    getUniformLocation: (_, name) => ({ name }),
    createBuffer: () => { stats.buffersCreated += 1; return { id: ++id }; },
    bindBuffer: () => {},
    bufferData: () => {},
    deleteBuffer: () => { stats.buffersDeleted += 1; },
    viewport: (x, y, w, h) => { stats.viewport = [w, h]; },
    clear: () => {
      if (stats.renderFailure) throw new Error('Test GPU draw failure');
      stats.frames += 1;
    },
    enable: () => {},
    disable: () => {},
    depthMask: () => {},
    blendFunc: () => {},
    useProgram: () => {},
    uniform1f: () => {},
    uniform3fv: (loc, val) => { if (loc) stats.uniforms.set(loc.name, val); },
    uniform4fv: (loc, val) => { if (loc) stats.uniforms.set(loc.name, val); },
    uniformMatrix4fv: () => {},
    enableVertexAttribArray: () => {},
    disableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    drawArrays: (_, __, count) => { stats.verticesDrawn += count; },
    getExtension: (name) => (name === 'WEBGL_lose_context' ? { loseContext: () => { stats.contextReleases += 1; } } : null)
  };
}

class FakeElement {
  constructor(width = 1280, height = 800) {
    this.clientWidth = width;
    this.clientHeight = height;
    this.width = width;
    this.height = height;
    this.id = '';
    this.className = '';
    this.dataset = {};
    this.style = {};
    this.attributes = {};
    this.events = new Map();
    this.children = [];
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(name, listener) { this.events.set(name, listener); }
  removeEventListener(name, listener) { if (this.events.get(name) === listener) this.events.delete(name); }
  append(child) { this.children.push(child); child.parent = this; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); }
}

function setup({
  finePointer = true,
  width = 1280,
  height = 800,
  dpr = 2,
  theme = 'light',
  scroll = 0,
  initFailure = false,
  shaderFailure = false
} = {}) {
  const stats = {
    frames: 0,
    verticesDrawn: 0,
    buffersCreated: 0,
    buffersDeleted: 0,
    programsCreated: 0,
    programsDeleted: 0,
    contextReleases: 0,
    initFailure,
    shaderFailure,
    renderFailure: false,
    uniforms: new Map(),
    viewport: [0, 0]
  };
  const queued = new Map();
  let frameId = 0;
  const host = new FakeElement(width, height);
  const fallback = new FakeElement();
  host.append(fallback);

  const fakeWindow = Object.assign(new FakeElement(width, height), {
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio: dpr,
    matchMedia: () => ({ matches: finePointer })
  });

  const sandbox = {
    module: { exports: {} },
    window: fakeWindow,
    document: {
      createElement: () => {
        const canvas = new FakeElement(width, height);
        canvas.getContext = (kind, options) => {
          if (stats.initFailure) return null;
          stats.contextOptions = options;
          stats.contextKind = kind;
          return createMockGL(stats);
        };
        return canvas;
      }
    },
    requestAnimationFrame: (callback) => { queued.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id) => queued.delete(id),
    ResizeObserver: class {
      constructor(callback) { stats.resize = callback; }
      observe() {}
      disconnect() { stats.resizeDisconnected = true; }
    }
  };

  runInNewContext(compiled.outputFiles[0].text, sandbox);
  const api = sandbox.module.exports;
  const failures = [];
  const steadyEvents = [];
  const controller = api.createScene(host, {
    theme,
    scroll,
    onSteady: (hex) => steadyEvents.push(hex),
    onFailure: (err) => failures.push(err)
  });

  function frame(timestamp = 16) {
    const callbacks = [...queued.values()];
    queued.clear();
    for (const cb of callbacks) cb(timestamp);
  }

  return { api, controller, stats, host, fallback, failures, steadyEvents, queued, frame, window: fakeWindow };
}

test('creation renders frame 1, schedules steady frame 2, and preserves SVG fallback', () => {
  const run = setup();
  assert.equal(run.stats.frames, 1);
  assert.equal(run.host.dataset.sceneState, 'ready');
  assert.equal(run.host.dataset.sceneAnimating, 'false');
  assert.equal(run.steadyEvents.length, 0);
  assert.equal(run.host.children[0], run.fallback);
  assert.equal(run.host.children[1].id, 'gl');
  assert.equal(run.host.children[1].className, 'stage__canvas');
  assert.equal(run.host.children[1].attributes['aria-hidden'], 'true');
  assert.equal(run.stats.contextOptions.powerPreference, 'low-power');

  // Steady gate fires on the second rendered frame even when animation stays paused
  run.frame(20);
  assert.equal(run.stats.frames, 2);
  assert.deepEqual(run.steadyEvents, ['#dff4fd']);
  assert.equal(run.host.dataset.sceneSteady, 'true');
  run.controller.dispose();
});

test('sub-native pixel buffer scales crisply for desktop and touch screens', () => {
  const { api } = setup();
  const [dw, dh, dScale] = api.computeBufferSize(1440, 900, 3, true);
  const [mw, mh, mScale] = api.computeBufferSize(390, 844, 3, false);
  assert.ok(dScale > 1.1 && dScale < 1.2);
  assert.ok(mScale > 0.85 && mScale < 0.95);
  assert.ok(dw > 1600 && dw < 1750 && dh > 1000);
  assert.ok(mw > 330 && mw < 380 && mh > 720);
});

test('phase-locked 9-blade axial GPU fan guarantees collision-free camera passage at any timestamp', () => {
  const { api } = setup();
  const [fx, fy, fz] = api.FAN_HUB_CENTER;

  // Test across arbitrary arrival timestamps, desktop & narrow mobile aspects, and pointer extremes
  for (const aspect of [1.77, 1.0, 0.46]) {
    for (const pointer of [{ x: 0, y: 0 }, { x: 1, y: -1 }, { x: -1, y: 1 }]) {
      for (let t = 0; t <= 120; t += 3.7) {
        for (let s = 0.76; s <= 0.89; s += 0.01) {
          const cam = api.cameraAt(s, aspect, pointer);
          // Only check collision while camera Z is near the rotor swept volume [fz - 0.35, fz + 0.35]
          if (Math.abs(cam.eye[2] - fz) > 0.45) continue;

          const dx = cam.eye[0] - fx;
          const dy = cam.eye[1] - fy;
          const r = Math.hypot(dx, dy);
          assert.ok(r > 0.85 && r < 2.15, `camera stays inside annular blade channel: r=${r}`);

          const camPhi = Math.atan2(dy, dx);
          const theta = api.fanAngleAt(s, t);
          const u = (r - 0.56) / (2.38 - 0.56);
          const chord = 0.26 + 0.12 * u;
          const pitch = 0.58 - 0.10 * u;
          const bladeHalfAng = (0.5 * chord * Math.cos(pitch)) / r;

          for (let b = 0; b < api.BLADE_COUNT; b += 1) {
            const bladeCenterPhi = b * api.BLADE_STEP + 0.18 * u * u + theta;
            const diff = Math.atan2(Math.sin(camPhi - bladeCenterPhi), Math.cos(camPhi - bladeCenterPhi));
            const clearance = Math.abs(diff) - bladeHalfAng;
            assert.ok(
              clearance > 0.20,
              `collision-free clearance violated at s=${s.toFixed(2)} t=${t.toFixed(1)}: clearance=${clearance.toFixed(3)} rad`
            );
          }
        }
      }
    }
  }
});

test('scroll spline advances continuously from panorama through fan gap into heatsink sanctuary', () => {
  const run = setup();
  const { api } = run;
  const start = api.cameraAt(0, 1.6);
  const intake = api.cameraAt(0.68, 1.6);
  const gap = api.cameraAt(0.84, 1.6);
  const die = api.cameraAt(1.0, 1.6);

  assert.ok(start.eye[2] > intake.eye[2]);
  assert.ok(intake.eye[2] > gap.eye[2]);
  assert.ok(gap.eye[2] > die.eye[2]);
  assert.equal(gap.eye[2], api.FAN_HUB_CENTER[2]);
  assert.ok(Math.abs(gap.eye[1] - (api.FAN_HUB_CENTER[1] + api.FAN_PASS_RADIUS)) < 1e-6);
  assert.equal(start.interiorBlend, 0);
  assert.equal(die.interiorBlend, 1);

  // Updating scroll while paused re-renders and switches ground color in the GPU sanctuary
  const before = run.stats.frames;
  run.controller.setScroll(0.96);
  assert.equal(run.stats.frames, before + 1);
  assert.equal(run.controller.getGroundColor(), '#0b256b');

  // Switching theme updates uniforms and ground color
  run.controller.setTheme('dark');
  assert.equal(run.controller.getGroundColor(), '#03091b');
  run.controller.dispose();
});

test('activation is idempotent, frame-throttled, and clamps long pauses', () => {
  const run = setup();
  run.frame(10); // flush steady frame
  run.controller.setActive(true);
  run.controller.setActive(true);
  assert.equal(run.queued.size, 1);
  assert.equal(run.host.dataset.sceneAnimating, 'true');

  run.frame(1000);
  const afterFirst = run.stats.frames;
  run.frame(1005); // throttled (< 18ms)
  assert.equal(run.stats.frames, afterFirst);
  run.frame(60000); // 59s tab pause clamped cleanly to <= 50ms delta
  assert.equal(run.stats.frames, afterFirst + 1);

  run.controller.setActive(false);
  assert.equal(run.queued.size, 0);
  assert.equal(run.host.dataset.sceneAnimating, 'false');
  run.controller.dispose();
});

test('dispose, init failure, shader failure, and context loss clean up and keep SVG fallback', () => {
  const failedInit = setup({ initFailure: true });
  assert.equal(failedInit.failures.length, 1);
  assert.equal(failedInit.host.dataset.sceneState, 'fallback');
  assert.deepEqual(failedInit.host.children, [failedInit.fallback]);

  const failedShader = setup({ shaderFailure: true });
  assert.equal(failedShader.failures.length, 1);
  assert.equal(failedShader.host.dataset.sceneState, 'fallback');

  const lost = setup();
  const canvas = lost.host.children[1];
  let prevented = false;
  canvas.events.get('webglcontextlost')({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(lost.failures.length, 1);
  assert.equal(lost.host.dataset.sceneState, 'fallback');

  const clean = setup();
  clean.controller.dispose();
  clean.controller.dispose();
  assert.equal(clean.stats.buffersDeleted, clean.stats.buffersCreated);
  assert.equal(clean.stats.programsDeleted, clean.stats.programsCreated);
  assert.equal(clean.stats.contextReleases, 1);
  assert.equal(clean.stats.resizeDisconnected, true);
  assert.deepEqual(clean.host.children, [clean.fallback]);
});

test('the checked-in zero-dependency bundle matches the current source and stays compact', async () => {
  const checkedIn = await readFile(resolve(here, '../../assets/js/scene.js'), 'utf8');
  const fresh = await build({
    entryPoints: [resolve(here, '../../assets/js/src/scene.js')],
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    legalComments: 'none',
    banner: { js: '/* Paper-plane architecture, Etihad Stadium & axial GPU foundry WebGL scene. */' }
  });
  assert.equal(checkedIn, fresh.outputFiles[0].text);
  assert.ok(Buffer.byteLength(checkedIn, 'utf8') < 60000, 'scene bundle must stay lightweight (< 60 KB)');
});
