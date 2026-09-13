import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

// Keep the production controller under test. Only the browser's dynamic-import
// boundary is replaced so each import can settle at a chosen lifecycle point.
const source = await readFile(new URL('../../assets/js/motion.js', import.meta.url), 'utf8');
assert.equal((source.match(/import\(sceneElement\.dataset\.sceneUrl\)/g) || []).length, 1);
const executable = source.replace('import(sceneElement.dataset.sceneUrl)', '__importScene(sceneElement.dataset.sceneUrl)');

class EventTargetStub {
  listeners = new Map();
  addEventListener(name, listener) {
    const listeners = this.listeners.get(name) || [];
    listeners.push(listener);
    this.listeners.set(name, listeners);
  }
  dispatchEvent(event) {
    for (const listener of this.listeners.get(event.type) || []) listener(event);
    return true;
  }
  fire(type, values = {}) { this.dispatchEvent({ type, ...values }); }
}

class ElementStub extends EventTargetStub {
  dataset = {};
  attributes = new Map();
  classes = new Set();
  properties = new Map();
  children = [];
  hidden = true;
  disabled = false;
  textContent = '';
  classList = {
    add: (name) => this.classes.add(name),
    remove: (name) => this.classes.delete(name),
    contains: (name) => this.classes.has(name)
  };
  style = {
    setProperty: (name, value) => this.properties.set(name, value),
    removeProperty: (name) => this.properties.delete(name)
  };
  setAttribute(name, value) { this.attributes.set(name, value); }
  appendChild(child) { this.children.push(child); }
  getBoundingClientRect() { return { left: 20, top: 30, width: 200, height: 100 }; }
}

class MediaStub extends EventTargetStub {
  constructor(matches) { super(); this.matches = matches; }
  change(matches) { this.matches = matches; this.fire('change'); }
}

function setup({ reducedMotion = false, stored = null, saveData = false, fine = true, deniedStorage = false } = {}) {
  const root = new ElementStub();
  const button = new ElementStub();
  const label = new ElementStub();
  const sceneElement = new ElementStub();
  const sceneHost = new ElementStub();
  const card = new ElementStub();
  const reduced = new MediaStub(reducedMotion);
  const finePointer = new MediaStub(fine);
  const document = new EventTargetStub();
  const window = new EventTargetStub();
  const imports = [];
  const scenes = [];
  const queuedFrames = new Map();
  const changes = [];
  let nextFrame = 0;
  let intersect;
  let persisted = stored;

  sceneElement.dataset.sceneUrl = '/acad-homepage.github.io/assets/js/compute-scene.js';
  sceneHost.dataset.sceneState = 'fallback';
  sceneElement.querySelector = (selector) => selector === '.scene-viewport' ? sceneHost : null;
  document.documentElement = root;
  document.hidden = false;
  document.createElement = () => new ElementStub();
  document.querySelector = (selector) => ({
    '.motion-toggle': button,
    '[data-motion-label]': label,
    '[data-compute-scene]': sceneElement
  })[selector] || null;
  document.querySelectorAll = (selector) => selector === '.floating-card' ? [card] : [];
  document.addEventListener('homepage:motionchange', (event) => changes.push(event.detail.enabled));
  window.matchMedia = (query) => query.includes('prefers-reduced-motion') ? reduced : finePointer;
  window.localStorage = {
    getItem() { if (deniedStorage) throw new Error('Storage denied'); return persisted; },
    setItem(key, value) { if (deniedStorage) throw new Error('Storage denied'); persisted = value; }
  };
  window.requestAnimationFrame = (callback) => { queuedFrames.set(++nextFrame, callback); return nextFrame; };
  window.cancelAnimationFrame = (id) => queuedFrames.delete(id);
  window.IntersectionObserver = class {
    constructor(callback) { intersect = callback; }
    observe(element) { assert.equal(element, sceneElement); }
  };
  const fakeModule = {
    createComputeScene(host, options) {
      assert.equal(host, sceneHost);
      const scene = {
        calls: [],
        onFailure: options.onFailure,
        setActive(value) {
          this.calls.push(value);
          host.dataset.sceneAnimating = String(value);
        }
      };
      scenes.push(scene);
      host.dataset.sceneState = 'ready';
      return scene;
    }
  };
  const sandbox = {
    window,
    document,
    navigator: { connection: { saveData } },
    IntersectionObserver: window.IntersectionObserver,
    CustomEvent: class { constructor(type, values) { this.type = type; this.detail = values.detail; } },
    __importScene: (url) => new Promise((resolve, reject) => imports.push({ url, resolve, reject }))
  };
  runInNewContext(executable, sandbox);

  return {
    root, button, label, sceneHost, card, reduced, finePointer, document, window,
    imports, scenes, changes, queuedFrames,
    persisted: () => persisted,
    inView(value) { intersect([{ isIntersecting: value }]); },
    async resolve(index = imports.length - 1) { imports[index].resolve(fakeModule); await Promise.resolve(); await Promise.resolve(); },
    async reject(index = imports.length - 1) { imports[index].reject(new Error('Test import failed')); await Promise.resolve(); await Promise.resolve(); },
    frame() {
      const callbacks = [...queuedFrames.values()];
      queuedFrames.clear();
      for (const callback of callbacks) callback();
    }
  };
}

test('reduced motion starts static and never downloads the scene', () => {
  const run = setup({ reducedMotion: true });
  run.inView(true);
  assert.equal(run.imports.length, 0);
  assert.equal(run.root.dataset.motion, 'off');
  assert.equal(run.button.disabled, true);
  assert.equal(run.button.attributes.get('aria-pressed'), 'false');
  assert.equal(run.label.textContent, 'Motion off');
  assert.equal(run.sceneHost.dataset.sceneState, 'fallback');
});

test('persisted off and data-saving preferences prevent initial scene downloads', () => {
  for (const options of [{ stored: 'off' }, { saveData: true }]) {
    const run = setup(options);
    run.inView(true);
    assert.equal(run.imports.length, 0);
    assert.equal(run.sceneHost.dataset.sceneState, 'fallback');
  }
});

test('scene loads lazily and pauses/resumes for viewport, tab, print, and page lifecycle', async () => {
  const run = setup();
  assert.equal(run.imports.length, 0);
  run.inView(false);
  assert.equal(run.imports.length, 0);
  run.inView(true);
  run.inView(true);
  assert.equal(run.imports.length, 1);
  assert.equal(run.imports[0].url, '/acad-homepage.github.io/assets/js/compute-scene.js');
  await run.resolve();
  assert.equal(run.scenes.length, 1);
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'true');
  run.inView(false);
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'false');
  run.inView(true);
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'true');
  run.document.hidden = true;
  run.document.fire('visibilitychange');
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'false');
  run.document.hidden = false;
  run.document.fire('visibilitychange');
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'true');
  run.window.fire('beforeprint');
  assert.equal(run.root.dataset.motion, 'off');
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'false');
  run.window.fire('afterprint');
  assert.equal(run.root.dataset.motion, 'on');
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'true');
  run.window.fire('pagehide', { persisted: true });
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'false');
  run.window.fire('pageshow', { persisted: true });
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'true');
  assert.equal(run.imports.length, 1);
});

test('manual motion toggle still works when localStorage reads and writes are denied', async () => {
  const run = setup({ deniedStorage: true });
  run.button.fire('click');
  run.inView(true);
  assert.equal(run.root.dataset.motion, 'off');
  assert.equal(run.imports.length, 0);
  run.button.fire('click');
  assert.equal(run.root.dataset.motion, 'on');
  assert.equal(run.imports.length, 1);
  await run.resolve();
  run.button.fire('click');
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'false');
  assert.equal(run.button.attributes.get('aria-pressed'), 'false');
});

test('system and cross-tab preferences take effect without recreating the scene', async () => {
  const run = setup();
  run.inView(true);
  await run.resolve();
  run.reduced.change(true);
  assert.equal(run.root.dataset.motion, 'off');
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'false');
  assert.equal(run.button.disabled, true);
  run.reduced.change(false);
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'true');
  run.window.fire('storage', { key: 'academic-visual-effects', newValue: 'off' });
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'false');
  run.window.fire('storage', { key: 'academic-visual-effects', newValue: 'on' });
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'true');
  run.button.fire('click');
  assert.equal(run.persisted(), 'off');
  run.window.fire('beforeprint');
  run.window.fire('afterprint');
  assert.equal(run.root.dataset.motion, 'off');
  assert.equal(run.scenes.length, 1);
});

test('BFCache: import settling while hidden creates nothing until pageshow', async () => {
  const run = setup();
  run.inView(true);
  run.window.fire('pagehide', { persisted: true });
  await run.resolve(0);
  assert.equal(run.scenes.length, 0);
  assert.equal(run.sceneHost.dataset.sceneState, 'fallback');
  run.window.fire('pageshow', { persisted: true });
  // The second import reuses the browser module cache; no stale generation gate.
  assert.equal(run.imports.length, 2);
  await run.resolve(1);
  assert.equal(run.scenes.length, 1);
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'true');
});

test('BFCache: an import still pending after pageshow creates exactly one active scene', async () => {
  const run = setup();
  run.inView(true);
  run.window.fire('pagehide', { persisted: true });
  run.window.fire('pageshow', { persisted: true });
  assert.equal(run.imports.length, 1);
  await run.resolve(0);
  assert.equal(run.scenes.length, 1);
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'true');
});

test('rejected imports retain fallback and do not repeatedly retry', async () => {
  const run = setup();
  run.inView(true);
  await run.reject();
  assert.equal(run.scenes.length, 0);
  assert.equal(run.sceneHost.dataset.sceneState, 'fallback');
  run.inView(false);
  run.inView(true);
  run.window.fire('pageshow');
  run.button.fire('click');
  run.button.fire('click');
  assert.equal(run.imports.length, 1);
});

test('fine mouse pointer tilt is bounded and resets on leave, cancel, scroll, and resize', () => {
  const run = setup();
  const pointer = { pointerType: 'mouse', clientX: 300, clientY: -100 };
  for (const event of ['pointerleave', 'pointercancel', 'scroll', 'resize']) {
    run.card.fire('pointerenter', pointer);
    run.card.fire('pointermove', pointer);
    run.card.fire('pointermove', pointer);
    assert.equal(run.queuedFrames.size, 1);
    run.frame();
    assert.equal(run.card.classes.has('is-tilting'), true);
    assert.equal(run.card.properties.get('--tilt-x'), '3.50deg');
    assert.equal(run.card.properties.get('--tilt-y'), '3.50deg');
    assert.equal(run.card.properties.get('--sheen-shift'), '40.00%');
    (event.startsWith('pointer') ? run.card : run.window).fire(event);
    assert.equal(run.card.classes.has('is-tilting'), false);
    assert.equal(run.card.properties.size, 0);
  }
  run.card.fire('pointermove', pointer);
  run.card.fire('pointerleave');
  assert.equal(run.queuedFrames.size, 0);
});

test('touch and coarse pointers cannot tilt; preferences/hidden tab reset in-flight effects', () => {
  const coarse = setup({ fine: false });
  coarse.card.fire('pointermove', { pointerType: 'mouse', clientX: 200, clientY: 50 });
  assert.equal(coarse.queuedFrames.size, 0);
  const run = setup();
  run.card.fire('pointermove', { pointerType: 'touch', clientX: 200, clientY: 50 });
  assert.equal(run.queuedFrames.size, 0);
  const pointer = { pointerType: 'mouse', clientX: 200, clientY: 50 };
  for (const reset of [
    () => run.button.fire('click'),
    () => run.finePointer.change(false),
    () => { run.document.hidden = true; run.document.fire('visibilitychange'); }
  ]) {
    run.card.fire('pointermove', pointer);
    reset();
    run.frame();
    assert.equal(run.card.properties.size, 0);
    assert.equal(run.card.classes.has('is-tilting'), false);
    if (run.root.dataset.motion === 'off') run.button.fire('click');
    run.finePointer.change(true);
    run.document.hidden = false;
  }
});
