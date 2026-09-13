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

function setup({ finePointer = true, width = 1280, height = 800, initFailure = false } = {}) {
  const stats = { frames: 0, disposals: 0, contextReleases: 0, initFailure, contextLost: false };
  const queuedFrames = new Map();
  let frameId = 0;
  const host = new FakeElement(width, height);
  const fallback = new FakeElement();
  host.append(fallback);
  const fakeWindow = Object.assign(new FakeElement(width, height), {
    devicePixelRatio: 3, matchMedia: () => ({ matches: finePointer })
  });
  const sandbox = {
    module: { exports: {} },
    stats,
    window: fakeWindow,
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
  return { controller, stats, host, fallback, failures, queuedFrames, frame, window: fakeWindow };
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
  assert.equal(run.window.events.size, 0);
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
  assert.equal(run.window.events.size, 0);
  assert.equal(run.queuedFrames.size, 0);
  assert.equal(run.host.dataset.sceneState, 'fallback');
});

test('the fixed scene contains five layered processors and instanced detail', () => {
  const run = setup();
  const scene = run.stats.scene;
  const stack = scene.getObjectByName('processor-stack');
  assert.equal(stack.children.filter((child) => child.name.startsWith('processor-layer-')).length, 5);
  assert.equal(scene.getObjectByName('processor-contacts').count, 192);
  assert.equal(scene.getObjectByName('silicon-dies').count, 16);
  assert.equal(scene.getObjectByName('compute-particles').count, 260);
  assert.equal(scene.getObjectByName('data-orbits').children.length, 3);
  assert.ok(scene.getObjectByName('memory-satellite-3'));
  assert.ok(stack.children[0].children[0].material.isMeshStandardMaterial);
  assert.ok(scene.getObjectByName('compute-universe').position.x > 0);
  run.controller.dispose();
});

test('scroll targets do not render or start an inactive scene and animate smoothly when active', () => {
  const run = setup();
  const scene = run.stats.scene;
  const layer = scene.getObjectByName('processor-layer-4');
  const initialY = layer.position.y;
  run.controller.setProgress(0.5);
  run.controller.setChapter(2);
  assert.equal(layer.position.y, initialY);
  assert.equal(run.stats.frames, 1);
  assert.equal(run.queuedFrames.size, 0);
  run.controller.setActive(true);
  run.frame(100);
  run.frame(150);
  const intermediateY = layer.position.y;
  assert.ok(intermediateY > initialY);
  for (let time = 200; time <= 2500; time += 50) run.frame(time);
  assert.ok(layer.position.y > intermediateY);
  assert.ok(layer.position.y < 2.2);
  run.controller.setActive(false);
  const pausedFrames = run.stats.frames;
  run.controller.setProgress(1);
  run.controller.setChapter(4);
  run.frame(3000);
  assert.equal(run.stats.frames, pausedFrames);
  run.controller.dispose();
});

test('progress and chapter reject invalid values and clamp valid targets', () => {
  const reference = setup();
  const bounded = setup();
  reference.controller.setProgress(1);
  reference.controller.setChapter(4);
  bounded.controller.setProgress(20);
  bounded.controller.setChapter(40);
  for (const value of [NaN, Infinity, -Infinity, '0', null, undefined]) {
    bounded.controller.setProgress(value);
    bounded.controller.setChapter(value);
  }
  reference.controller.setActive(true);
  bounded.controller.setActive(true);
  for (let time = 100; time < 800; time += 50) {
    reference.frame(time);
    bounded.frame(time);
  }
  const firstLayer = reference.stats.scene.getObjectByName('processor-layer-4');
  const secondLayer = bounded.stats.scene.getObjectByName('processor-layer-4');
  assert.equal(firstLayer.position.y, secondLayer.position.y);
  assert.equal(firstLayer.rotation.y, secondLayer.rotation.y);
  reference.controller.setProgress(0);
  reference.controller.setChapter(0);
  bounded.controller.setProgress(-20);
  bounded.controller.setChapter(-30);
  for (let time = 800; time < 1600; time += 50) {
    reference.frame(time);
    bounded.frame(time);
  }
  assert.equal(firstLayer.position.y, secondLayer.position.y);
  bounded.stats.scene.traverse((object) => {
    assert.ok(object.position.toArray().every(Number.isFinite));
    assert.ok([object.rotation.x, object.rotation.y, object.rotation.z].every(Number.isFinite));
  });
  reference.controller.dispose();
  bounded.controller.dispose();
});

test('portrait layout centers the sculpture below the midpoint and keeps it in the camera frustum', () => {
  const run = setup({ width: 390, height: 844 });
  const universe = run.stats.scene.getObjectByName('compute-universe');
  assert.equal(universe.position.x, 0);
  assert.ok(universe.position.y < 0);
  const camera = run.stats.camera;
  const visibleWidth = 2 * Math.tan(camera.fov * Math.PI / 360) * camera.position.z * camera.aspect;
  assert.ok(visibleWidth >= 6.79);
  assert.equal(run.stats.pixelRatio, 1);
  run.host.clientWidth = 1440;
  run.host.clientHeight = 900;
  run.stats.resize();
  assert.ok(universe.position.x > 0);
  assert.equal(run.stats.pixelRatio, 1.5);
  run.controller.dispose();
});

test('pointer parallax uses the window, ignores touch, and cleans up on disposal', () => {
  const run = setup();
  const universe = run.stats.scene.getObjectByName('compute-universe');
  const pointerMove = run.window.events.get('pointermove');
  assert.equal(typeof pointerMove, 'function');
  run.controller.setActive(true);
  pointerMove({ pointerType: 'touch', clientX: 1280, clientY: 0 });
  run.frame(100);
  run.frame(150);
  assert.equal(universe.rotation.y, 0);
  pointerMove({ pointerType: 'mouse', clientX: 1280, clientY: 0 });
  run.frame(200);
  assert.ok(universe.rotation.y > 0);
  assert.ok(universe.rotation.y <= 0.065);
  run.window.events.get('pointerout')({ relatedTarget: null });
  const rotation = universe.rotation.y;
  run.frame(250);
  assert.ok(universe.rotation.y < rotation);
  run.controller.dispose();
  assert.equal(run.window.events.size, 0);
  run.controller.setProgress(0.2);
  run.controller.setChapter(3);
  assert.equal(run.queuedFrames.size, 0);
});
