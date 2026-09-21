import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../../assets/js/space-gateway.js', import.meta.url), 'utf8');
assert.equal((source.match(/import\(gateway\.dataset\.sceneUrl\)/g) || []).length, 1);
const executable = source.replace('import(gateway.dataset.sceneUrl)', '__importScene(gateway.dataset.sceneUrl)');

class Events {
  listeners = new Map();
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }
  dispatchEvent(event) {
    for (const handler of this.listeners.get(event.type) || []) handler(event);
    return !event.defaultPrevented;
  }
  fire(type, values = {}) {
    const event = { type, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...values };
    this.dispatchEvent(event);
    return event;
  }
}

class Element extends Events {
  dataset = {};
  attributes = new Map();
  classes = new Set();
  textContent = '';
  focusCount = 0;
  rect = { left: 0, top: 0, bottom: 800, width: 1200, height: 800 };
  classList = {
    add: (name) => this.classes.add(name),
    remove: (name) => this.classes.delete(name),
    contains: (name) => this.classes.has(name),
    toggle: (name, value) => value ? this.classes.add(name) : this.classes.delete(name)
  };
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  getBoundingClientRect() { return this.rect; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  contains(target) { return target === this; }
  focus() { this.focusCount += 1; }
}

async function flush() { for (let i = 0; i < 5; i += 1) await Promise.resolve(); }

function setup({ motion = 'on', reducedMotion = false, saveData = false, noObserver = false, deepLink = false, asyncReady = false, constructionError = false, legacyAnchor = false } = {}) {
  const root = new Element();
  const body = new Element();
  const gateway = new Element();
  const host = new Element();
  const status = new Element();
  const loading = new Element();
  const chapter = new Element();
  const skip = new Element();
  const back = new Element();
  const document = new Events();
  const window = new Events();
  const reduced = new Events();
  const connection = new Events();
  const imports = [];
  const scenes = [];
  const timers = new Map();
  const navigations = [];
  const visibility = [];
  let nextTimer = 0;
  let intersect;
  root.dataset.motion = motion;
  gateway.dataset.sceneUrl = '/acad-homepage.github.io/assets/js/space-scene.js';
  if (deepLink) gateway.rect = { left: 0, top: -2400, bottom: -1600, width: 1200, height: 800 };
  host.rect = { left: 10, top: 20, bottom: 820, width: 1200, height: 800 };
  const links = ['research', 'blog'].map((id, index) => {
    const link = new Element();
    const orb = new Element();
    orb.rect = { left: 110 + index * 360, top: 180, width: 88, height: 88 };
    link.dataset = { destination: id, label: index ? 'Blog' : 'Research', x: '0.3', y: '0.4', mobileX: '0.2', mobileY: '0.3', radius: '44', kind: 'ocean', color: '#78bfff' };
    link.setAttribute('href', index ? '/acad-homepage.github.io/blog/' : legacyAnchor ? '#research-interests' : '/acad-homepage.github.io/research/');
    link.querySelector = (selector) => selector === '.space-planet-orb' ? orb : null;
    link.orb = orb;
    return link;
  });
  gateway.querySelector = (selector) => ({ '[data-space-canvas]': host, '[data-space-status]': status, '[data-space-loading]': loading })[selector] || null;
  gateway.querySelectorAll = () => links;
  document.documentElement = root;
  document.body = body;
  document.hidden = false;
  document.querySelector = () => gateway;
  document.querySelectorAll = () => [skip, back];
  document.getElementById = (id) => id === 'research-interests' ? chapter : null;
  document.addEventListener('homepage:gatewayvisibility', (event) => visibility.push(event.detail.visible));
  reduced.matches = reducedMotion;
  connection.saveData = saveData;
  window.innerHeight = 800;
  window.matchMedia = () => reduced;
  window.setTimeout = (callback, delay) => { timers.set(++nextTimer, { callback, delay }); return nextTimer; };
  window.clearTimeout = (id) => timers.delete(id);
  window.location = {
    href: 'https://example.com/acad-homepage.github.io/' + (deepLink ? '#research-interests' : ''),
    origin: 'https://example.com', pathname: '/acad-homepage.github.io/', search: '', hash: deepLink ? '#research-interests' : '',
    assign(url) { navigations.push(url); this.href = url; this.hash = new URL(url).hash; }
  };
  if (!noObserver) window.IntersectionObserver = class {
    constructor(callback, options) { intersect = callback; assert.deepEqual(Array.from(options.threshold), [0, 0.5, 1]); }
    observe(element) { assert.equal(element, gateway); }
  };
  const module = {
    createSpaceScene(element, options) {
      assert.equal(element, host);
      if (constructionError) throw new Error('WebGL unavailable');
      const renderer = {
        options, active: [], hovered: [], positions: [options.destinations], flights: [], cancelled: 0, disposed: 0,
        setActive(value) { this.active.push(value); },
        setHovered(value) { this.hovered.push(value); },
        setDestinations(value) { this.positions.push(value); },
        travelTo(id) { return new Promise((resolve, reject) => this.flights.push({ id, resolve, reject })); },
        cancelTravel() { this.cancelled += 1; },
        dispose() { this.disposed += 1; }
      };
      scenes.push(renderer);
      if (!asyncReady) options.onReady();
      return renderer;
    }
  };
  runInNewContext(executable, {
    window, document, navigator: { connection }, URL,
    IntersectionObserver: window.IntersectionObserver,
    CustomEvent: class { constructor(type, values) { this.type = type; this.detail = values.detail; } },
    __importScene: (url) => new Promise((resolve, reject) => imports.push({ url, resolve, reject }))
  });
  return {
    root, body, gateway, host, status, loading, chapter, skip, back, document, window, reduced, connection, links, imports, scenes, timers, navigations, visibility,
    inView(ratio = 1) { intersect([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]); },
    async resolve() { imports.at(-1).resolve(module); await flush(); },
    async reject() { imports.at(-1).reject(new Error('Network unavailable')); await flush(); },
    click(index = 0, values = {}) { return links[index].fire('click', { button: 0, ...values }); },
    motion(enabled) { root.dataset.motion = enabled ? 'on' : 'off'; document.fire('homepage:motionchange', { detail: { enabled } }); },
    timer(delay) {
      for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.callback(); }
    },
    async ready() { this.inView(); await this.resolve(); return scenes[0]; }
  };
}

test('gateway imports once only when visible and uses actual orb geometry', async () => {
  const run = setup();
  assert.equal(run.imports.length, 0);
  assert.equal(run.body.classes.has('has-space-gateway'), true);
  assert.deepEqual(run.visibility, [true]);
  const scene = await run.ready();
  assert.equal(run.imports.length, 1);
  assert.equal(run.gateway.classes.has('space-flight-ready'), true);
  assert.equal(scene.positions[0][0].x, 0.12);
  assert.equal(scene.positions[0][0].y, 0.255);
  assert.equal(scene.positions[0][0].radius, 44);
  assert.equal(scene.active.at(-1), true);
  run.inView(0.3);
  assert.equal(run.visibility.at(-1), true);
  assert.equal(run.body.classes.has('space-at-gateway'), false);
  assert.equal(scene.active.at(-1), false);
  run.inView(0);
  assert.equal(run.visibility.at(-1), false);
  run.inView();
  assert.equal(run.imports.length, 1);
  assert.equal(scene.active.at(-1), true);
});

test('motion off, reduced motion, data saving and missing observers keep links native', () => {
  for (const options of [{ motion: 'off' }, { reducedMotion: true }, { saveData: true }, { noObserver: true }]) {
    const run = setup(options);
    if (!options.noObserver) run.inView();
    assert.equal(run.imports.length, 0);
    assert.equal(run.click().defaultPrevented, false);
    assert.equal(run.gateway.classes.has('space-flight-ready'), false);
  }
});

test('deep-link arrival never scrolls, focuses, loads or redirects to the gateway', () => {
  const run = setup({ deepLink: true });
  run.inView(0);
  assert.deepEqual(run.visibility, [false, false]);
  assert.equal(run.imports.length, 0);
  assert.deepEqual(run.navigations, []);
  assert.equal(run.chapter.focusCount, 0);
  assert.equal(run.window.location.hash, '#research-interests');
});

test('successful research flight opens its independent archive without focusing the old chapter', async () => {
  const run = setup();
  const scene = await run.ready();
  assert.equal(run.click().defaultPrevented, true);
  assert.equal(run.gateway.getAttribute('aria-busy'), 'true');
  assert.match(run.status.textContent, /Flying to Research/);
  assert.equal(scene.flights[0].id, 'research');
  scene.flights[0].resolve(true);
  await flush();
  assert.deepEqual(run.navigations, ['https://example.com/acad-homepage.github.io/research/']);
  assert.equal(run.chapter.focusCount, 0);
  assert.equal(run.chapter.hasAttribute('tabindex'), false);
  assert.equal(run.gateway.hasAttribute('aria-busy'), false);
});

test('explicit same-document destinations retain native anchor focus behavior', async () => {
  const run = setup({ legacyAnchor: true });
  const scene = await run.ready();
  run.click();
  scene.flights[0].resolve(true);
  await flush();
  assert.deepEqual(run.navigations, ['https://example.com/acad-homepage.github.io/#research-interests']);
  assert.equal(run.chapter.focusCount, 1);
  assert.equal(run.chapter.getAttribute('tabindex'), '-1');
  run.chapter.fire('blur');
  assert.equal(run.chapter.hasAttribute('tabindex'), false);
});

test('blog flight uses its native project-baseurl path without focusing a chapter', async () => {
  const run = setup();
  const scene = await run.ready();
  run.click(1);
  scene.flights[0].resolve(true);
  await flush();
  assert.deepEqual(run.navigations, ['https://example.com/acad-homepage.github.io/blog/']);
  assert.equal(run.chapter.focusCount, 0);
});

test('modified, middle-button, target-blank and download clicks stay native', async () => {
  const run = setup();
  const scene = await run.ready();
  for (const values of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    assert.equal(run.click(0, values).defaultPrevented, Boolean(values.defaultPrevented));
  }
  run.links[0].setAttribute('target', '_blank');
  assert.equal(run.click().defaultPrevented, false);
  run.links[0].removeAttribute('target');
  run.links[0].setAttribute('download', '');
  assert.equal(run.click().defaultPrevented, false);
  assert.equal(scene.flights.length, 0);
});

test('repeated clicks cannot launch or navigate a second flight', async () => {
  const run = setup();
  const scene = await run.ready();
  run.click();
  assert.equal(run.click(1).defaultPrevented, true);
  assert.equal(scene.flights.length, 1);
  assert.equal(run.click(1, { ctrlKey: true }).defaultPrevented, false);
});

test('Escape cancels, restores link focus and ignores a stale completion', async () => {
  const run = setup();
  const scene = await run.ready();
  run.click();
  const event = run.document.fire('keydown', { key: 'Escape' });
  assert.equal(event.defaultPrevented, true);
  assert.equal(run.links[0].focusCount, 1);
  assert.equal(run.gateway.hasAttribute('aria-busy'), false);
  scene.flights[0].resolve(true);
  await flush();
  assert.deepEqual(run.navigations, []);
  run.click(1);
  assert.equal(scene.flights.length, 2);
});

test('leaving, hiding, pagehide, print and motion changes cancel pending navigation', async () => {
  for (const suspend of [
    (run) => run.inView(0.2),
    (run) => { run.document.hidden = true; run.document.fire('visibilitychange'); },
    (run) => run.window.fire('pagehide'),
    (run) => run.window.fire('beforeprint'),
    (run) => run.motion(false),
    (run) => { run.reduced.matches = true; run.reduced.fire('change'); },
    (run) => { run.connection.saveData = true; run.connection.fire('change'); }
  ]) {
    const run = setup();
    const scene = await run.ready();
    run.click();
    suspend(run);
    assert.equal(scene.active.at(-1), false);
    assert.equal(run.gateway.hasAttribute('aria-busy'), false);
    scene.flights[0].resolve(true);
    await flush();
    assert.deepEqual(run.navigations, []);
  }
});

test('skip links and hash changes cancel flights but retain native navigation', async () => {
  for (const action of [
    (run) => assert.equal(run.skip.fire('click').defaultPrevented, false),
    (run) => assert.equal(run.back.fire('click').defaultPrevented, false),
    (run) => { run.window.location.hash = '#about-me'; run.window.fire('hashchange'); }
  ]) {
    const run = setup();
    const scene = await run.ready();
    run.click();
    action(run);
    scene.flights[0].resolve(true);
    await flush();
    assert.deepEqual(run.navigations, []);
  }
});

test('a pending import does not construct while hidden and resumes without a second download', async () => {
  const run = setup();
  run.inView();
  run.document.hidden = true;
  run.document.fire('visibilitychange');
  await run.resolve();
  assert.equal(run.scenes.length, 0);
  run.document.hidden = false;
  run.document.fire('visibilitychange');
  assert.equal(run.scenes.length, 1);
  assert.equal(run.imports.length, 1);
});

test('import failures and initialization exceptions fall back without intercepting links', async () => {
  const rejected = setup();
  rejected.inView();
  await rejected.reject();
  assert.equal(rejected.host.dataset.sceneState, 'fallback');
  assert.equal(rejected.click().defaultPrevented, false);
  rejected.inView();
  assert.equal(rejected.imports.length, 1);
  const thrown = setup({ constructionError: true });
  await thrown.ready();
  assert.equal(thrown.host.dataset.sceneState, 'fallback');
  assert.equal(thrown.click().defaultPrevented, false);
});

test('a stalled import times out and ignores its late result', async () => {
  const run = setup();
  run.inView();
  run.timer(8000);
  assert.equal(run.host.dataset.sceneState, 'fallback');
  assert.equal(run.click().defaultPrevented, false);
  await run.resolve();
  assert.equal(run.scenes.length, 0);
});

test('renderer readiness timeout disposes safely and cannot later hide the fallback', async () => {
  const run = setup({ asyncReady: true });
  const scene = await run.ready();
  assert.equal(run.click().defaultPrevented, false);
  run.timer(8000);
  assert.equal(scene.disposed, 1);
  scene.options.onReady();
  assert.equal(run.gateway.classes.has('space-flight-ready'), false);
});

test('renderer failure during a flight still opens the chosen destination', async () => {
  const run = setup();
  const scene = await run.ready();
  run.click();
  scene.options.onFailure();
  scene.flights[0].resolve(true);
  await flush();
  assert.equal(scene.disposed, 1);
  assert.equal(run.navigations.length, 1);
  assert.equal(run.gateway.classes.has('space-flight-ready'), false);
});

test('rejected travel and stalled travel never trap a selected destination', async () => {
  const rejected = setup();
  const rejectedScene = await rejected.ready();
  rejected.click();
  rejectedScene.flights[0].reject(new Error('Context lost'));
  await flush();
  assert.equal(rejected.navigations.length, 1);
  const stalled = setup();
  const stalledScene = await stalled.ready();
  stalled.click();
  stalled.timer(8000);
  stalledScene.flights[0].resolve(true);
  await flush();
  assert.equal(stalled.navigations.length, 1);
});

test('a cancelled renderer travel stays at the gateway', async () => {
  const run = setup();
  const scene = await run.ready();
  run.click();
  scene.flights[0].resolve(false);
  await flush();
  assert.deepEqual(run.navigations, []);
  assert.equal(run.gateway.hasAttribute('aria-busy'), false);
});

test('pointer and keyboard focus highlight planets and clear on exit', async () => {
  const run = setup();
  const scene = await run.ready();
  run.links[0].fire('pointerenter');
  run.links[0].fire('pointerleave');
  run.links[1].fire('focusin');
  run.links[1].fire('focusout');
  assert.deepEqual(scene.hovered, ['research', null, 'blog', null]);
  run.motion(false);
  run.links[0].fire('pointerenter');
  assert.equal(scene.hovered.length, 4);
});

test('resize batches geometry updates and computes responsive orb positions', async () => {
  const run = setup();
  const scene = await run.ready();
  run.host.rect = { left: 0, top: 0, bottom: 800, width: 400, height: 800 };
  run.links[0].orb.rect = { left: 52, top: 132, width: 56, height: 56 };
  run.window.fire('resize');
  run.window.fire('resize');
  assert.equal([...run.timers.values()].filter((timer) => timer.delay === 100).length, 1);
  run.timer(100);
  assert.equal(scene.positions.length, 2);
  assert.equal(scene.positions[1][0].x, 0.2);
  assert.equal(scene.positions[1][0].y, 0.2);
  assert.equal(scene.positions[1][0].radius, 28);
});

test('resuming page and print states reuses the existing renderer', async () => {
  const run = setup();
  const scene = await run.ready();
  run.window.fire('pagehide');
  run.window.fire('pageshow');
  assert.equal(scene.active.at(-1), true);
  run.window.fire('beforeprint');
  run.window.fire('afterprint');
  assert.equal(scene.active.at(-1), true);
  assert.equal(run.scenes.length, 1);
});

test('unsafe or external hrefs are never used by the scripted navigation path', async () => {
  const run = setup();
  const scene = await run.ready();
  for (const href of ['https://other.example/blog', 'javascript:alert(1)', 'data:text/html,no']) {
    run.links[0].setAttribute('href', href);
    assert.equal(run.click().defaultPrevented, false);
  }
  assert.equal(scene.flights.length, 0);
});

test('flight deck markup links to six real pages and has no scrolling-homepage controls', async () => {
  const template = await readFile(new URL('../../_includes/space-gateway.html', import.meta.url), 'utf8');
  for (const path of ['profile', 'research', 'education', 'projects', 'interests', 'blog']) {
    assert.match(template, new RegExp('data-destination="' + path + '"[^>]+href="\\{\\{ \'/' + path + '/\' \\| relative_url \\}\\}"'));
  }
  assert.match(template, /data-space-skip href="\{\{ '\/profile\/' \| relative_url \}\}">Open archive/);
  assert.doesNotMatch(template, /href="#|data-space-return|class="space-scroll"|Scroll to homepage/);
});
