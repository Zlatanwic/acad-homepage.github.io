import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

// site.js is a classic script; dynamic import() is rewritten to an injectable
// loader so the test controls when and whether the scene module arrives.
const source = (await readFile(new URL('../../assets/js/site.js', import.meta.url), 'utf8'))
  .replace('import(url)', '__import(url)');

function classList() {
  const set = new Set();
  return { add: (name) => set.add(name), remove: (name) => set.delete(name), contains: (name) => set.has(name) };
}

function element(attributes = {}, rect = { left: 0, top: 0, bottom: 100, width: 200, height: 100 }) {
  const events = new Map();
  const properties = new Map();
  return {
    attributes: { ...attributes },
    events,
    properties,
    classList: classList(),
    style: {
      setProperty: (name, value) => properties.set(name, value),
      removeProperty: (name) => properties.delete(name)
    },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] ?? null; },
    addEventListener(name, listener) { events.set(name, listener); },
    getBoundingClientRect: () => rect
  };
}

function mediaQuery(matches) {
  const listeners = [];
  return { matches, addEventListener: (_, listener) => listeners.push(listener), fire() { listeners.forEach((l) => l()); }, listeners };
}

async function flush() {
  for (let index = 0; index < 5; index += 1) await Promise.resolve();
}

function setup({ reduce = false, fine = true, dark = false, saveData = false, scene = true, intersection = true, module } = {}) {
  const queries = {
    '(prefers-reduced-motion: reduce)': mediaQuery(reduce),
    '(hover: hover) and (pointer: fine)': mediaQuery(fine),
    '(prefers-color-scheme: dark)': mediaQuery(dark)
  };
  const storage = new Map();
  const root = Object.assign(element(), { scrollHeight: 3000 });
  const themeMeta = element({ name: 'theme-color', content: '#ffffff' });
  const themeBtn = element();
  const langBtn = element();
  const card = element();
  const winA = element({}, { left: 0, top: 40, bottom: 240, width: 320, height: 200 });
  const winB = element({}, { left: 0, top: 340, bottom: 540, width: 320, height: 200 });
  const host = scene ? element({ 'data-scene-src': '/base/assets/js/scene.js' }) : null;
  const documentEvents = new Map();
  const windowEvents = new Map();
  const frames = [];
  const imports = [];
  const calls = [];
  let observerCallback = null;
  let groundHex = '#dff4fd';
  const controller = {
    setActive: (value) => calls.push(['active', value]),
    setScroll: (value) => calls.push(['scroll', Number(value.toFixed(3))]),
    setTheme: (value) => { calls.push(['theme', value]); groundHex = value === 'dark' ? '#050d20' : '#dff4fd'; },
    getGroundColor: () => groundHex,
    dispose: () => calls.push(['dispose'])
  };
  const loaded = module ?? {
    createScene: (target, options) => { calls.push(['create', target, options]); return controller; }
  };
  let resolveImport;
  const document = {
    readyState: 'complete',
    hidden: false,
    documentElement: root,
    querySelector: (selector) => {
      if (selector === '[data-scene]') return host;
      if (selector === 'meta[name="theme-color"]') return themeMeta;
      return null;
    },
    querySelectorAll: (selector) => {
      if (selector === '[data-tilt]') return [card];
      if (selector === '[data-theme-toggle]') return [themeBtn];
      if (selector === '[data-lang-toggle]') return [langBtn];
      if (selector === '.win') return [winA, winB];
      return [];
    },
    addEventListener: (name, listener) => documentEvents.set(name, listener)
  };
  const window = {
    innerWidth: 1280,
    innerHeight: 1000,
    scrollY: 0,
    localStorage: {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, String(v))
    },
    matchMedia: (query) => queries[query],
    navigator: { connection: saveData ? { saveData: true } : undefined },
    location: { href: 'https://example.com/base/' },
    URL,
    requestAnimationFrame: (callback) => { frames.push(callback); return frames.length; },
    cancelAnimationFrame: () => {},
    addEventListener: (name, listener) => windowEvents.set(name, listener),
    IntersectionObserver: intersection ? class {
      constructor(callback) { observerCallback = callback; }
      observe() {}
    } : undefined
  };
  const sandbox = {
    window,
    document,
    Promise,
    __import: (url) => {
      imports.push(url);
      return new Promise((resolve) => { resolveImport = () => resolve(loaded); });
    }
  };
  runInNewContext(source, sandbox);
  return {
    root, themeMeta, themeBtn, langBtn, storage, card, winA, winB, host, document, window,
    frames, imports, calls, queries, documentEvents, windowEvents,
    intersect: (value) => observerCallback([{ isIntersecting: value }]),
    resolve: async () => { resolveImport(); await flush(); }
  };
}

test('the scene module is requested once visible and steady gate sets html.glon + --gbg', async () => {
  const run = setup();
  assert.deepEqual(run.imports, []);
  run.intersect(false);
  assert.deepEqual(run.imports, []);
  run.intersect(true);
  run.intersect(true);
  assert.deepEqual(run.imports, ['https://example.com/base/assets/js/scene.js']);
  await run.resolve();
  assert.equal(run.calls[0][0], 'create');
  assert.equal(run.calls[0][1], run.host);
  assert.deepEqual(run.calls.at(-1), ['active', true]);

  // Trigger onSteady callback from scene controller
  run.calls[0][2].onSteady('#dff4fd');
  assert.equal(run.root.classList.contains('glon'), true);
  assert.equal(run.root.properties.get('--gbg'), '#dff4fd');
});

test('scroll progress drives scene camera, sanctuary classes, and mobile center-window shadow', async () => {
  const run = setup();
  run.intersect(true);
  await run.resolve();

  run.window.innerWidth = 390;
  run.window.innerHeight = 900;
  run.window.scrollY = 1995; // 1995 / (3000 - 900) = 0.95
  run.windowEvents.get('scroll')();
  run.frames.shift()();

  assert.deepEqual(run.calls.at(-1), ['scroll', 0.95]);
  assert.equal(run.root.classList.contains('is-scrolled'), true);
  assert.equal(run.root.classList.contains('in-sanctuary'), true);
  assert.equal(run.root.classList.contains('at-climax'), true);
  assert.equal(run.winB.classList.contains('is-center'), true);
  assert.equal(run.winA.classList.contains('is-center'), false);
});

test('theme and bilingual desk buttons persist choices and notify the 3D scene', async () => {
  const run = setup();
  run.intersect(true);
  await run.resolve();

  assert.equal(run.root.getAttribute('data-theme'), 'light');
  assert.equal(run.root.getAttribute('data-lang'), 'en');

  run.themeBtn.events.get('click')();
  assert.equal(run.root.getAttribute('data-theme'), 'dark');
  assert.equal(run.storage.get('kl-theme'), 'dark');
  assert.deepEqual(run.calls.at(-1), ['theme', 'dark']);
  assert.equal(run.themeBtn.getAttribute('aria-pressed'), 'true');

  run.langBtn.events.get('click')();
  assert.equal(run.root.getAttribute('data-lang'), 'zh');
  assert.equal(run.storage.get('kl-lang'), 'zh');
  assert.equal(run.langBtn.getAttribute('aria-pressed'), 'true');
});

test('scrolling away, hiding the tab, or preferring reduced motion pauses the scene', async () => {
  const run = setup();
  run.intersect(true);
  await run.resolve();
  run.intersect(false);
  assert.deepEqual(run.calls.at(-1), ['active', false]);
  run.intersect(true);
  run.document.hidden = true;
  run.documentEvents.get('visibilitychange')();
  assert.deepEqual(run.calls.at(-1), ['active', false]);
  run.document.hidden = false;
  run.documentEvents.get('visibilitychange')();
  assert.deepEqual(run.calls.at(-1), ['active', true]);
  run.queries['(prefers-reduced-motion: reduce)'].matches = true;
  run.queries['(prefers-reduced-motion: reduce)'].fire();
  assert.deepEqual(run.calls.at(-1), ['active', false]);
});

test('reduced motion still loads the 3D architecture as a scroll-responsive still frame', async () => {
  const run = setup({ reduce: true });
  run.intersect(true);
  await run.resolve();
  assert.equal(run.calls[0][0], 'create');
  assert.deepEqual(run.calls.at(-1), ['active', false]);
});

test('data saver keeps the static drawing and never downloads the module', () => {
  const run = setup({ saveData: true });
  assert.throws(() => run.intersect(true), 'no observer is registered');
  assert.deepEqual(run.imports, []);
});

test('pages without a scene do not observe or import anything', () => {
  const run = setup({ scene: false });
  assert.deepEqual(run.imports, []);
  assert.equal(run.documentEvents.has('visibilitychange'), false);
});

test('without IntersectionObserver the scene loads immediately', async () => {
  const run = setup({ intersection: false });
  assert.equal(run.imports.length, 1);
  await run.resolve();
  assert.deepEqual(run.calls.at(-1), ['active', true]);
});

test('a module without createScene is ignored and leaving the page disposes the scene', async () => {
  const broken = setup({ module: {} });
  broken.intersect(true);
  await broken.resolve();
  assert.deepEqual(broken.calls, []);

  const run = setup();
  run.intersect(true);
  await run.resolve();
  run.windowEvents.get('pagehide')({ persisted: true });
  assert.deepEqual(run.calls.at(-1), ['active', false]);
  run.windowEvents.get('pageshow')({ persisted: true });
  assert.deepEqual(run.calls.at(-1), ['active', true]);
  run.windowEvents.get('pagehide')({ persisted: false });
  assert.deepEqual(run.calls.at(-1), ['dispose']);
});

test('cards tilt toward a fine pointer and settle back on leave', () => {
  const run = setup({ scene: false });
  run.card.events.get('pointermove')({ pointerType: 'mouse', clientX: 200, clientY: 0 });
  assert.equal(run.card.classList.contains('is-tilting'), true);
  run.frames.shift()();
  assert.equal(run.card.properties.get('--rx'), '3.50deg');
  assert.equal(run.card.properties.get('--ry'), '4.50deg');
  assert.equal(run.card.properties.get('--mx'), '100.0%');
  run.card.events.get('pointerleave')();
  assert.equal(run.card.classList.contains('is-tilting'), false);
  assert.equal(run.card.properties.has('--rx'), false);
});

test('touch, coarse pointers and reduced motion never tilt cards', () => {
  for (const options of [{ fine: false }, { reduce: true }]) {
    const run = setup({ scene: false, ...options });
    run.card.events.get('pointermove')({ pointerType: 'mouse', clientX: 20, clientY: 20 });
    assert.equal(run.frames.length, 0);
  }
  const touch = setup({ scene: false });
  touch.card.events.get('pointermove')({ pointerType: 'touch', clientX: 20, clientY: 20 });
  assert.equal(touch.frames.length, 0);
});
