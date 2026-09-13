import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

// Keep the production controller under test. Only the browser's dynamic-import
// boundary is replaced so each import can settle at a chosen lifecycle point.
const source = await readFile(new URL('../../assets/js/motion.js', import.meta.url), 'utf8');
assert.equal((source.match(/import\(sceneElement\.dataset\.sceneUrl\)/g) || []).length, 1);
const executable = source.replace('import(sceneElement.dataset.sceneUrl)', '__importScene(sceneElement.dataset.sceneUrl)');
const homepageSource = await readFile(new URL('../../assets/js/homepage.js', import.meta.url), 'utf8');
const navigationSource = await readFile(new URL('../../_data/navigation.yml', import.meta.url), 'utf8');
const aboutSource = await readFile(new URL('../../_pages/about.md', import.meta.url), 'utf8');
const configuredAnchors = [...navigationSource.matchAll(/url:\s*"(#[^"]+)"/g)].map((match) => match[1]);

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
    contains: (name) => this.classes.has(name),
    toggle: (name, selected) => selected ? this.classes.add(name) : this.classes.delete(name)
  };
  style = {
    setProperty: (name, value) => this.properties.set(name, value),
    removeProperty: (name) => this.properties.delete(name)
  };
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  appendChild(child) { this.children.push(child); }
  getBoundingClientRect() { return { left: 20, top: 30, width: 200, height: 100 }; }
}

class MediaStub extends EventTargetStub {
  constructor(matches) { super(); this.matches = matches; }
  change(matches) { this.matches = matches; this.fire('change'); }
}

function setup({ reducedMotion = false, stored = null, saveData = false, fine = true, deniedStorage = false, sceneMethods = true } = {}) {
  const root = new ElementStub();
  const button = new ElementStub();
  const label = new ElementStub();
  const sceneElement = new ElementStub();
  const sceneHost = new ElementStub();
  const card = new ElementStub();
  const magnetic = new ElementStub();
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
  document.querySelectorAll = (selector) => ({ '.floating-card': [card], '[data-magnetic]': [magnetic] })[selector] || [];
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
        positions: [],
        chapters: [],
        onFailure: options.onFailure,
        setActive(value) {
          this.calls.push(value);
          host.dataset.sceneAnimating = String(value);
        }
      };
      if (sceneMethods) {
        scene.setProgress = function (value) { this.positions.push(value); };
        scene.setChapter = function (value) { this.chapters.push(value); };
      }
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
    root, button, label, sceneHost, card, magnetic, reduced, finePointer, document, window,
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
    assert.equal(run.card.properties.get('--tilt-x'), '5.00deg');
    assert.equal(run.card.properties.get('--tilt-y'), '5.00deg');
    assert.equal(run.card.properties.get('--sheen-shift'), '40.00%');
    (event.startsWith('pointer') ? run.card : run.window).fire(event);
    assert.equal(run.card.classes.has('is-tilting'), false);
    assert.equal(run.card.properties.size, 0);
  }
  run.card.fire('pointermove', pointer);
  run.card.fire('pointerleave');
  assert.equal(run.queuedFrames.size, 0);
});

test('scroll progress and chapter are retained during loading and safely clamped', async () => {
  const run = setup();
  run.document.fire('homepage:scroll', { detail: { progress: 0.35, chapter: 2 } });
  run.inView(true);
  await run.resolve();
  assert.deepEqual(run.scenes[0].positions, [0.35]);
  assert.deepEqual(run.scenes[0].chapters, [2]);
  run.document.fire('homepage:scroll', { detail: { progress: 2, chapter: 8 } });
  assert.equal(run.scenes[0].positions.at(-1), 1);
  assert.equal(run.scenes[0].chapters.at(-1), 4);
  run.document.fire('homepage:scroll', { detail: { progress: NaN, chapter: Infinity } });
  assert.equal(run.scenes[0].positions.at(-1), 1);
  assert.equal(run.scenes[0].chapters.at(-1), 4);
  run.document.fire('homepage:scroll', { detail: { progress: -1, chapter: -2 } });
  assert.equal(run.scenes[0].positions.at(-1), 0);
  assert.equal(run.scenes[0].chapters.at(-1), 0);
  assert.equal(run.queuedFrames.size, 0);
});

test('scroll coordination supports an older scene without optional position methods', async () => {
  const run = setup({ sceneMethods: false });
  run.inView(true);
  await run.resolve();
  run.document.fire('homepage:scroll', { detail: { progress: 0.8, chapter: 3 } });
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'true');
});

test('opaque paper coverage pauses the scene and safely defers an in-flight lazy import', async () => {
  const run = setup();
  const cover = (sceneCovered) => run.document.fire('homepage:scroll', { detail: { sceneCovered } });
  cover(true);
  run.inView(true);
  assert.equal(run.imports.length, 0);
  cover(false);
  assert.equal(run.imports.length, 1);
  cover(true);
  await run.resolve();
  assert.equal(run.scenes.length, 0);
  cover(false);
  assert.equal(run.imports.length, 2);
  await run.resolve();
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'true');
  cover(true);
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'false');
  const calls = run.scenes[0].calls.length;
  cover(true);
  assert.equal(run.scenes[0].calls.length, calls); // No repeated activation work on unchanged coverage.
  cover(false);
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'true');
  assert.equal(run.imports.length, 2);
  run.document.hidden = true;
  run.document.fire('visibilitychange');
  cover(true);
  cover(false);
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'false');
  run.document.hidden = false;
  run.document.fire('visibilitychange');
  assert.equal(run.sceneHost.dataset.sceneAnimating, 'true');
});

test('magnetic links are bounded to eight pixels and reset for keyboard and pointer lifecycle', () => {
  const run = setup();
  const pointer = { pointerType: 'mouse', clientX: 500, clientY: -100 };
  for (const event of ['pointerleave', 'pointercancel', 'focusin', 'keydown', 'scroll', 'resize']) {
    run.magnetic.fire('pointermove', pointer);
    run.magnetic.fire('pointermove', pointer);
    assert.equal(run.queuedFrames.size, 1);
    run.frame();
    assert.equal(run.magnetic.properties.get('--magnetic-x'), '8.00px');
    assert.equal(run.magnetic.properties.get('--magnetic-y'), '-8.00px');
    (event === 'scroll' || event === 'resize' ? run.window : run.magnetic).fire(event);
    assert.equal(run.magnetic.properties.size, 0);
  }
  run.magnetic.fire('pointermove', pointer);
  run.button.fire('click');
  assert.equal(run.queuedFrames.size, 0);
  assert.equal(run.magnetic.properties.size, 0);
  run.button.fire('click');
  run.magnetic.fire('pointermove', { ...pointer, pointerType: 'touch' });
  assert.equal(run.queuedFrames.size, 0);
  run.finePointer.change(false);
  run.magnetic.fire('pointermove', pointer);
  assert.equal(run.queuedFrames.size, 0);
});

test('pagehide cancels pending pointer effects and prevents new pointer frames', () => {
  const run = setup();
  const pointer = { pointerType: 'mouse', clientX: 100, clientY: 50 };
  run.card.fire('pointermove', pointer);
  run.magnetic.fire('pointermove', pointer);
  assert.equal(run.queuedFrames.size, 2);
  run.window.fire('pagehide');
  assert.equal(run.queuedFrames.size, 0);
  run.card.fire('pointermove', pointer);
  run.magnetic.fire('pointermove', pointer);
  assert.equal(run.queuedFrames.size, 0);
  run.window.fire('pageshow');
  run.card.fire('pointermove', pointer);
  assert.equal(run.queuedFrames.size, 1);
});

function setupHomepage({ reducedMotion = false, stored = 'on' } = {}) {
  const root = new ElementStub();
  const masthead = new ElementStub();
  const document = new EventTargetStub();
  const window = new EventTargetStub();
  const reduced = new MediaStub(reducedMotion);
  const queuedFrames = new Map();
  const events = [];
  const observers = [];
  const reveals = [new ElementStub(), new ElementStub()];
  const cards = [new ElementStub(), new ElementStub()];
  const paper = new ElementStub();
  let nextFrame = 0;
  root.dataset.motion = stored;
  root.scrollHeight = 5600;
  document.hidden = false;
  document.documentElement = root;
  window.scrollY = 0;
  window.innerHeight = 1000;
  paper.getBoundingClientRect = () => ({ top: 2600 - window.scrollY, bottom: 4000 - window.scrollY, height: 1400 });
  window.matchMedia = (query) => query.includes('prefers-reduced-motion') ? reduced : new MediaStub(false);
  window.requestAnimationFrame = (callback) => { queuedFrames.set(++nextFrame, callback); return nextFrame; };
  window.cancelAnimationFrame = (id) => queuedFrames.delete(id);
  const chapters = [0, 1000, 2600, 4000, 5100].map((offset, index) => {
    const section = new ElementStub();
    section.dataset.sceneChapter = String(index);
    section.id = ['about-me', 'research-interests', 'journey-chapter', 'projects', 'contact'][index];
    section.getBoundingClientRect = () => ({ top: offset - window.scrollY, height: 1000 });
    return section;
  });
  const sectionTargets = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const anchorOffsets = { education: 2800, 'research-experience': 3300, news: 3650, publications: 4900 };
  for (const [id, offset] of Object.entries(anchorOffsets)) {
    const section = new ElementStub();
    section.id = id;
    section.getBoundingClientRect = () => ({ top: offset - window.scrollY, height: 300 });
    sectionTargets.set(id, section);
  }
  const links = ['#about-me', ...configuredAnchors].map((hash) => {
    const link = new ElementStub();
    link.hash = hash;
    return link;
  });
  document.querySelector = (selector) => selector === '.masthead' ? masthead : null;
  document.querySelectorAll = (selector) => {
    if (selector === '[data-scene-chapter]') return chapters;
    if (selector === '.floating-card') return cards;
    if (selector === '.paper-chapter') return [paper];
    if (selector === "#site-nav a[href^='#']") return links;
    if (selector === '[data-reveal]' || selector.startsWith('.section-heading')) return reveals;
    return [];
  };
  document.getElementById = (id) => sectionTargets.get(id);
  document.addEventListener('homepage:scroll', (event) => events.push(event.detail));
  window.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; this.disconnected = false; this.elements = []; observers.push(this); }
    observe(element) { this.elements.push(element); }
    unobserve() {}
    disconnect() { this.disconnected = true; }
  };
  runInNewContext(homepageSource, {
    window, document,
    getComputedStyle: () => ({ getPropertyValue: () => '76' }),
    IntersectionObserver: window.IntersectionObserver,
    CustomEvent: class { constructor(type, values) { this.type = type; this.detail = values.detail; } }
  });
  return {
    root, masthead, document, window, reduced, queuedFrames, events, chapters, links, reveals, observers, cards,
    frame() {
      const callbacks = [...queuedFrames.values()];
      queuedFrames.clear();
      for (const callback of callbacks) callback();
    }
  };
}

test('native scrolling coordinates progress, hero parallax, chapters, and navigation in one frame', () => {
  const run = setupHomepage();
  assert.equal(run.root.dataset.chapter, '0');
  assert.equal(run.root.properties.get('--hero-progress'), 0);
  run.window.scrollY = 1300;
  run.window.fire('scroll');
  run.window.fire('scroll');
  assert.equal(run.queuedFrames.size, 1);
  run.frame();
  assert.equal(run.root.dataset.chapter, '1');
  assert.equal(run.root.properties.get('--reading-progress'), 1300 / 4600);
  assert.equal(run.root.properties.get('--scroll-progress'), 1300 / 4600);
  assert.equal(run.root.properties.get('--hero-progress'), 1);
  assert.equal(run.events.at(-1).chapter, 1);
  assert.equal(run.links[1].attributes.get('aria-current'), 'location');
  assert.equal(run.masthead.classes.has('is-scrolled'), true);
  assert.equal(run.queuedFrames.size, 0);
  run.window.scrollY = 2250; // Education crosses the 45% viewport chapter line.
  run.window.fire('scroll');
  run.frame();
  assert.equal(run.root.dataset.chapter, '2');
  run.window.scrollY = 4600; // Short contact footer is still reachable as the last chapter.
  run.window.fire('scroll');
  run.frame();
  assert.equal(run.root.dataset.chapter, '4');
  assert.equal(run.root.properties.get('--scroll-progress'), 1);
  assert.equal(run.links.at(-1).attributes.get('aria-current'), 'location');
  assert.equal(run.window.listeners.has('wheel'), false);
  assert.equal(run.window.listeners.has('touchmove'), false);
});

test('scene coverage is true only when an opaque panel fills the viewport below the header', () => {
  const run = setupHomepage();
  assert.equal(run.events.at(-1).sceneCovered, false);
  for (const [scrollY, covered] of [[2500, false], [2524, true], [2800, true], [3000, true], [3001, false]]) {
    run.window.scrollY = scrollY;
    run.window.fire('scroll');
    run.frame();
    assert.equal(run.events.at(-1).sceneCovered, covered, `coverage at scrollY ${scrollY}`);
  }
});

test('reduced or paused motion reveals all content and disables hero parallax', () => {
  for (const options of [{ reducedMotion: true }, { stored: 'off' }]) {
    const run = setupHomepage(options);
    run.window.scrollY = 500;
    run.window.fire('scroll');
    run.frame();
    assert.equal(run.root.properties.get('--hero-progress'), 0);
    for (const element of run.reveals) {
      assert.equal(element.classes.has('is-visible'), true);
      assert.equal(element.classes.has('is-inview'), false);
    }
    assert.equal(run.observers.length, 1); // Activity observer stays ready if motion is later enabled.
    run.observers[0].callback([{ isIntersecting: true, target: run.cards[0] }]);
    assert.equal(run.cards[0].classes.has('is-inview'), false);
  }
  const run = setupHomepage();
  run.observers[0].callback([{ isIntersecting: true, target: run.reveals[0] }]);
  assert.equal(run.reveals[0].classes.has('is-visible'), true);
  run.root.dataset.motion = 'off';
  run.document.fire('homepage:motionchange', { detail: { enabled: false } });
  assert.equal(run.reveals[1].classes.has('is-visible'), true);
  assert.equal(run.observers[0].disconnected, true);
});

test('scroll controller stops scheduling in hidden tabs and pagehide, then restores via pageshow', () => {
  const run = setupHomepage();
  run.window.fire('scroll');
  run.window.fire('pagehide');
  assert.equal(run.queuedFrames.size, 0);
  run.window.fire('scroll');
  assert.equal(run.queuedFrames.size, 0);
  run.window.fire('pageshow');
  assert.equal(run.queuedFrames.size, 1);
  run.document.hidden = true;
  run.document.fire('visibilitychange');
  assert.equal(run.queuedFrames.size, 0);
  run.window.fire('scroll');
  assert.equal(run.queuedFrames.size, 0);
  run.document.hidden = false;
  run.document.fire('visibilitychange');
  run.frame();
  assert.equal(run.queuedFrames.size, 0);
});

test('card activity tracks actual intersections while one-shot reveals remain visible', () => {
  const run = setupHomepage();
  const activity = run.observers.find((observer) => observer.elements.includes(run.cards[0]));
  run.observers[0].callback([{ target: run.cards[0], isIntersecting: true }]);
  activity.callback(run.cards.map((target) => ({ target, isIntersecting: true })));
  assert.equal(run.cards[0].classes.has('is-visible'), true);
  assert.equal(run.cards[0].classes.has('is-inview'), true);
  activity.callback([{ target: run.cards[0], isIntersecting: false }]);
  assert.equal(run.cards[0].classes.has('is-inview'), false);
  assert.equal(run.cards[0].classes.has('is-visible'), true);
  assert.equal(run.cards[1].classes.has('is-inview'), true);

  run.document.hidden = true;
  run.document.fire('visibilitychange');
  assert.equal(run.root.dataset.pageHidden, 'true');
  assert.equal(run.cards[1].classes.has('is-inview'), false);
  run.document.hidden = false;
  run.document.fire('visibilitychange');
  assert.equal(run.root.dataset.pageHidden, 'false');
  assert.equal(run.cards[1].classes.has('is-inview'), true);
  assert.equal(run.cards[0].classes.has('is-inview'), false);

  run.root.dataset.motion = 'off';
  run.document.fire('homepage:motionchange', { detail: { enabled: false } });
  assert.equal(run.cards[1].classes.has('is-inview'), false);
  activity.callback([{ target: run.cards[0], isIntersecting: true }]);
  assert.equal(run.cards[0].classes.has('is-inview'), false);
  run.root.dataset.motion = 'on';
  run.document.fire('homepage:motionchange', { detail: { enabled: true } });
  assert.equal(run.cards[0].classes.has('is-inview'), true);
  assert.equal(run.cards[1].classes.has('is-inview'), true);
  run.window.fire('pagehide');
  assert.equal(run.root.dataset.pageHidden, 'true');
  assert.equal(run.cards[0].classes.has('is-inview'), false);
  assert.equal(run.cards[1].classes.has('is-inview'), false);
  run.window.fire('pageshow');
  assert.equal(run.root.dataset.pageHidden, 'false');
  assert.equal(run.cards[1].classes.has('is-inview'), true);
});

test('configured navigation matches unique DOM targets and follows nested journey sections', () => {
  assert.ok(configuredAnchors.length > 0);
  const targetPositions = configuredAnchors.map((hash) => {
    const id = hash.slice(1);
    const matches = [...aboutSource.matchAll(new RegExp(`\\bid="${id}"`, 'g'))];
    assert.equal(matches.length, 1, `${hash} must have exactly one DOM target`);
    return matches[0].index;
  });
  assert.deepEqual(targetPositions, targetPositions.slice().sort((a, b) => a - b));
  const run = setupHomepage();
  const nested = [
    ['#education', 2850],
    ['#research-experience', 3350],
    ['#news', 3700],
    ['#projects', 4050],
    ['#publications', 4600]
  ];
  for (const [hash, scrollY] of nested) {
    run.window.scrollY = scrollY;
    run.window.fire('scroll');
    run.frame();
    const selected = run.links.filter((link) => link.attributes.get('aria-current') === 'location');
    assert.equal(selected.length, 1);
    assert.equal(selected[0].hash, hash);
  }
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
