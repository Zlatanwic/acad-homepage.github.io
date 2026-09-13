import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

// Exercise the real scene graph and controller with only GPU/DOM/RAF boundaries
// substituted. Live WebGL rendering is additionally verified in the browser.
const here = dirname(fileURLToPath(import.meta.url));
const realThree = resolve(here, 'node_modules/three/build/three.module.js');
const bundled = await build({
  entryPoints: [resolve(here, '../../assets/js/src/compute-scene.js')],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  plugins: [{
    name: 'test-renderer',
    setup(builder) {
      builder.onResolve({ filter: /^three$/ }, () => ({ path: 'test-three', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
        resolveDir: here,
        contents: `
          export * from ${JSON.stringify(realThree)};
          export class WebGLRenderer {
            constructor(options) {
              if (globalThis.stats.initFailure) throw new Error('Test WebGL unavailable');
              this.options = options;
              this.debug = {};
              globalThis.stats.renderer = this;
            }
            setClearColor() {}
            setPixelRatio(value) { globalThis.stats.pixelRatio = value; }
            setSize(width, height) { globalThis.stats.size = [width, height]; }
            render(scene, camera) {
              if (globalThis.stats.renderFailure) throw new Error('Test GPU failure');
              globalThis.stats.frames += 1;
              globalThis.stats.scene = scene;
              globalThis.stats.camera = camera;
            }
            getContext() { return { isContextLost: () => globalThis.stats.contextLost }; }
            dispose() { globalThis.stats.disposals += 1; }
            forceContextLoss() { globalThis.stats.contextReleases += 1; }
          }
        `
      }));
    }
  }]
});

class FakeElement {
  constructor(width = 250, height = 195) {
    this.clientWidth = width;
    this.clientHeight = height;
    this.dataset = {};
    this.events = new Map();
    this.children = [];
  }
  setAttribute() {}
  addEventListener(name, listener) { this.events.set(name, listener); }
  removeEventListener(name, listener) { if (this.events.get(name) === listener) this.events.delete(name); }
  append(child) { this.children.push(child); child.parent = this; }
  closest() { return this; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this); }
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
}

function setup({ finePointer = true, width = 250, height = 195, initFailure = false } = {}) {
  const stats = { frames: 0, disposals: 0, contextReleases: 0, initFailure, contextLost: false };
  const queuedFrames = new Map();
  let frameId = 0;
  const host = new FakeElement(width, height);
  const fallback = new FakeElement();
  host.append(fallback);
  const sandbox = {
    module: { exports: {} },
    stats,
    window: { devicePixelRatio: 3, matchMedia: () => ({ matches: finePointer }) },
    document: { createElement: () => new FakeElement() },
    requestAnimationFrame: (callback) => { queuedFrames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id) => queuedFrames.delete(id),
    ResizeObserver: class {
      constructor(callback) { stats.resize = callback; }
      observe() {}
      disconnect() { stats.resizeDisconnected = true; }
    }
  };
  runInNewContext(bundled.outputFiles[0].text, sandbox);
  const failures = [];
  const controller = sandbox.module.exports.createComputeScene(host, { onFailure: (error) => failures.push(error) });
  function frame(timestamp) {
    const callbacks = [...queuedFrames.values()];
    queuedFrames.clear();
    for (const callback of callbacks) callback(timestamp);
  }
  return { controller, stats, host, fallback, failures, queuedFrames, frame };
}

test('creation renders once, preserves fallback, and starts without an animation loop', () => {
  const run = setup();
  assert.equal(run.stats.frames, 1);
  assert.equal(run.host.dataset.sceneState, 'ready');
  assert.equal(run.host.dataset.sceneAnimating, 'false');
  assert.equal(run.queuedFrames.size, 0);
  assert.equal(run.host.children[0], run.fallback);
  assert.equal(run.stats.pixelRatio, 1.5);
  assert.equal(run.stats.renderer.options.powerPreference, 'low-power');
  run.controller.dispose();
});

test('animation is idempotent, rate-limited, pausable, and resumes without catch-up', () => {
  const run = setup();
  run.controller.setActive(true);
  run.controller.setActive(true);
  assert.equal(run.queuedFrames.size, 1);
  run.frame(100);
  run.frame(116);
  assert.equal(run.stats.frames, 2);
  run.frame(134);
  assert.equal(run.stats.frames, 3);
  run.controller.setActive(false);
  assert.equal(run.queuedFrames.size, 0);
  assert.equal(run.host.dataset.sceneAnimating, 'false');
  run.controller.setActive(true);
  run.frame(100000);
  assert.equal(run.stats.frames, 4);
  run.controller.dispose();
  run.controller.dispose();
  run.controller.setActive(true);
  assert.equal(run.queuedFrames.size, 0);
  assert.equal(run.stats.disposals, 1);
  assert.equal(run.stats.contextReleases, 1);
  assert.equal(run.stats.resizeDisconnected, true);
  assert.equal(run.host.events.size, 0);
  assert.deepEqual(run.host.children, [run.fallback]);
});

test('coarse and small screens cap pixel ratio at one and resize the camera', () => {
  const run = setup({ finePointer: false });
  assert.equal(run.stats.pixelRatio, 1);
  run.host.clientWidth = 190;
  run.host.clientHeight = 155;
  run.stats.resize();
  assert.equal(run.stats.size[0], 190);
  assert.equal(run.stats.camera.aspect, 190 / 155);
  assert.equal(run.stats.frames, 2);
  run.controller.dispose();
  const smallRun = setup({ width: 200 });
  assert.equal(smallRun.stats.pixelRatio, 1);
  smallRun.controller.dispose();
});

test('zero-size initial host stays static and can become visible later', () => {
  const run = setup({ width: 0, height: 0 });
  assert.equal(run.stats.frames, 0);
  assert.equal(run.host.dataset.sceneState, 'fallback');
  run.controller.setActive(true);
  run.frame(100);
  assert.equal(run.queuedFrames.size, 1);
  run.host.clientWidth = 250;
  run.host.clientHeight = 195;
  run.stats.resize();
  assert.equal(run.host.dataset.sceneState, 'ready');
  run.frame(150);
  assert.equal(run.stats.frames, 2);
  run.controller.dispose();
});

test('initialization failure leaves the fallback and reports failure only once', () => {
  const run = setup({ initFailure: true });
  assert.equal(run.host.dataset.sceneState, 'fallback');
  assert.equal(run.failures.length, 1);
  run.controller.setActive(true);
  run.controller.dispose();
  assert.equal(run.failures.length, 1);
  assert.equal(run.queuedFrames.size, 0);
  assert.deepEqual(run.host.children, [run.fallback]);
});

test('render failure cleans up the active loop and returns to static SVG', () => {
  const run = setup();
  run.controller.setActive(true);
  run.stats.renderFailure = true;
  run.frame(100);
  assert.equal(run.host.dataset.sceneState, 'fallback');
  assert.equal(run.host.dataset.sceneAnimating, 'false');
  assert.equal(run.failures.length, 1);
  assert.equal(run.stats.disposals, 1);
  assert.equal(run.queuedFrames.size, 0);
  assert.deepEqual(run.host.children, [run.fallback]);
});

test('lost contexts stop permanently, remove listeners, and never restart', () => {
  const run = setup();
  const canvas = run.host.children[1];
  const onLost = canvas.events.get('webglcontextlost');
  let prevented = false;
  run.controller.setActive(true);
  onLost({ preventDefault() { prevented = true; } });
  onLost({ preventDefault() {} });
  run.controller.setActive(true);
  assert.equal(prevented, true);
  assert.equal(run.failures.length, 1);
  assert.equal(canvas.events.size, 0);
  assert.equal(run.queuedFrames.size, 0);
  assert.equal(run.host.dataset.sceneState, 'fallback');
});
