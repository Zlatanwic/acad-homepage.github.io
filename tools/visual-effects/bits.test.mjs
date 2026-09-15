import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../../assets/js/bits.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../../_sass/_bits-effects.scss', import.meta.url), 'utf8');
const homepage = await readFile(new URL('../../assets/js/homepage.js', import.meta.url), 'utf8');
const template = await readFile(new URL('../../_pages/about.md', import.meta.url), 'utf8');

class Events {
  listeners = new Map();
  addEventListener(name, listener) {
    const listeners = this.listeners.get(name) || [];
    listeners.push(listener);
    this.listeners.set(name, listeners);
  }
  fire(type, detail = {}) { for (const listener of this.listeners.get(type) || []) listener({ type, ...detail }); }
}
class Element extends Events {
  classes = new Set();
  children = [];
  properties = new Map();
  attributes = new Map();
  dataset = {};
  boundsReads = 0;
  bounds = { left: 10, top: 20, width: 200, height: 100 };
  textContent = 'Original semantic content';
  classList = {
    contains: (name) => this.classes.has(name),
    add: (name) => this.classes.add(name),
    remove: (name) => this.classes.delete(name),
    toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)
  };
  style = {
    setProperty: (name, value) => this.properties.set(name, value),
    removeProperty: (name) => this.properties.delete(name)
  };
  set className(value) { this.classes = new Set(value.split(' ')); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  appendChild(child) { this.children.push(child); }
  querySelector(selector) { return this.children.find((child) => child.classes.has(selector.slice(1))) || null; }
  querySelectorAll(selector) { return this.children.filter((child) => child.classes.has(selector.slice(1))); }
  getBoundingClientRect() { this.boundsReads++; return this.bounds; }
}
class Media extends Events {
  constructor(matches) { super(); this.matches = matches; }
  change(matches) { this.matches = matches; this.fire('change'); }
}

function setup({ motion = 'on', reduce = false, fine = true, hidden = false, io = true, brokenIO = false } = {}) {
  const root = new Element();
  root.dataset.motion = motion;
  const heading = new Element();
  const words = Array.from({ length: 8 }, () => { const word = new Element(); word.classList.add('bits-word'); return word; });
  heading.children.push(...words);
  const shiny = new Element();
  const star = new Element();
  const card = new Element();
  const glare = new Element();
  const reduced = new Media(reduce);
  const finePointer = new Media(fine);
  const document = new Events();
  document.hidden = hidden;
  document.documentElement = root;
  document.createElement = () => new Element();
  const groups = {
    '[data-bits-blur]': [heading], '[data-bits-shiny]': [shiny],
    '[data-bits-star]': [star], '[data-bits-spotlight]': [card], '[data-bits-glare]': [glare]
  };
  document.querySelectorAll = (selector) => groups[selector] || [];
  const window = new Events();
  window.matchMedia = (query) => query.includes('prefers-reduced-motion') ? reduced : finePointer;
  const frames = new Map();
  let nextFrame = 0;
  window.requestAnimationFrame = (callback) => { frames.set(++nextFrame, callback); return nextFrame; };
  window.cancelAnimationFrame = (id) => frames.delete(id);
  const observers = [];
  if (io) window.IntersectionObserver = class {
    constructor(callback) {
      if (brokenIO) throw new Error('Observer not available');
      this.callback = callback;
      this.targets = [];
      observers.push(this);
    }
    observe(target) { this.targets.push(target); }
    disconnect() { this.targets = []; }
  };
  runInNewContext(source, { window, document });
  const intersect = (target, isIntersecting = true) => observers[0]?.callback([{ target, isIntersecting }]);
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback()); };
  const setMotion = (value) => { root.dataset.motion = value; document.fire('homepage:motionchange'); };
  return { root, heading, words, shiny, star, card, glare, document, window, reduced, finePointer, frames, observers, intersect, flush, setMotion };
}
const pointer = (clientX = 110, clientY = 70, pointerType = 'mouse') => ({ clientX, clientY, pointerType });

test('decorative layers are aria-hidden and semantic text is unchanged', () => {
  const ui = setup();
  assert.equal(ui.card.children.length, 1);
  assert.equal(ui.glare.children.length, 1);
  assert.equal(ui.star.children.length, 2);
  for (const host of [ui.card, ui.glare, ui.star]) {
    assert.equal(host.textContent, 'Original semantic content');
    for (const child of host.children) assert.equal(child.attributes.get('aria-hidden'), 'true');
  }
  assert.equal(ui.heading.textContent, 'Original semantic content');
  assert.equal(ui.words[0].properties.get('--bits-delay'), '0ms');
  assert.equal(ui.words[7].properties.get('--bits-delay'), '425ms');
  assert.doesNotMatch(source, /innerHTML|textContent\s*=/);
});

test('one observer gates all continuous effects and heading reveals are one-shot', () => {
  const ui = setup();
  assert.equal(ui.observers.length, 1);
  assert.equal(ui.observers[0].targets.length, 5);
  assert.ok(ui.heading.classes.has('bits-ready'));
  assert.ok(!ui.heading.classes.has('bits-revealed'));
  ui.intersect(ui.heading);
  ui.intersect(ui.shiny);
  assert.ok(ui.heading.classes.has('bits-revealed'));
  assert.ok(ui.shiny.classes.has('bits-inview'));
  ui.intersect(ui.heading, false);
  ui.intersect(ui.shiny, false);
  assert.ok(ui.heading.classes.has('bits-revealed'));
  assert.ok(!ui.shiny.classes.has('bits-inview'));
  assert.equal(ui.frames.size, 0);
});

test('no observer or unavailable observer leaves text readable and ambient effects stopped', () => {
  for (const options of [{ io: false }, { brokenIO: true }]) {
    const ui = setup(options);
    assert.ok(!ui.heading.classes.has('bits-ready'));
    assert.ok(!ui.shiny.classes.has('bits-inview'));
    assert.ok(!ui.star.classes.has('bits-inview'));
    assert.equal(ui.frames.size, 0);
  }
});

test('initial disabled, reduced and hidden states do not arm heading or pointer effects', () => {
  for (const options of [{ motion: 'off' }, { reduce: true }, { hidden: true }]) {
    const ui = setup(options);
    ui.intersect(ui.star);
    ui.card.fire('pointermove', pointer());
    assert.ok(!ui.heading.classes.has('bits-ready'));
    assert.ok(!ui.root.classes.has('bits-active'));
    assert.ok(!ui.star.classes.has('bits-inview'));
    assert.equal(ui.frames.size, 0);
  }
});

test('pointer work is coalesced to one frame with the latest bounded coordinates', () => {
  const ui = setup();
  ui.card.fire('pointerenter', pointer());
  ui.card.fire('pointermove', pointer(2000, -20));
  assert.equal(ui.frames.size, 1);
  assert.equal(ui.card.boundsReads, 1);
  ui.flush();
  assert.equal(ui.card.properties.get('--bits-spotlight-x'), '200.0px');
  assert.equal(ui.card.properties.get('--bits-spotlight-y'), '0.0px');
  assert.ok(ui.card.classes.has('bits-pointer-active'));
  assert.equal(ui.frames.size, 0, 'No perpetual animation loop');
});

test('touch and coarse pointers do not activate the desktop glare or spotlight', () => {
  for (const ui of [setup(), setup({ fine: false })]) {
    ui.card.fire('pointermove', pointer(100, 50, 'touch'));
    ui.glare.fire('pointerenter', pointer(100, 50, 'touch'));
    assert.equal(ui.frames.size, 0);
  }
  const coarse = setup({ fine: false });
  coarse.card.fire('pointermove', pointer());
  assert.equal(coarse.frames.size, 0);
});

test('leave, cancel and keyboard focus discard pending pointer frames and reset offsets', () => {
  for (const event of ['pointerleave', 'pointercancel', 'focusin', 'keydown']) {
    const ui = setup();
    ui.card.fire('pointermove', pointer());
    ui.flush();
    ui.card.fire('pointermove', pointer(150, 80));
    ui.card.fire(event);
    assert.equal(ui.frames.size, 0);
    assert.equal(ui.card.properties.size, 0);
    assert.ok(!ui.card.classes.has('bits-pointer-active'));
    ui.card.fire('pointermove', pointer());
    assert.equal(ui.card.boundsReads, 2, 'Bounds must be remeasured after reset');
  }
});

test('scroll, resize and pointer capability changes clear transforms without mutating card tilt', () => {
  for (const event of ['scroll', 'resize', 'media']) {
    const ui = setup();
    ui.card.style.setProperty('--tilt-x', '3deg');
    ui.card.fire('pointermove', pointer());
    ui.flush();
    ui.card.fire('pointermove', pointer());
    if (event === 'media') ui.finePointer.change(false);
    else ui.window.fire(event);
    assert.equal(ui.frames.size, 0);
    assert.equal(ui.card.properties.get('--tilt-x'), '3deg');
    assert.ok(!ui.card.properties.has('--bits-spotlight-x'));
  }
});

test('motion toggle suspends all effects and resumes only visible ambient effects', () => {
  const ui = setup();
  ui.intersect(ui.star);
  ui.intersect(ui.shiny, false);
  ui.card.fire('pointermove', pointer());
  ui.setMotion('off');
  assert.equal(ui.frames.size, 0);
  assert.ok(!ui.root.classes.has('bits-active'));
  assert.ok(!ui.star.classes.has('bits-inview'));
  assert.ok(!ui.heading.classes.has('bits-ready'));
  ui.setMotion('on');
  assert.ok(ui.star.classes.has('bits-inview'));
  assert.ok(!ui.shiny.classes.has('bits-inview'));
  assert.ok(!ui.heading.classes.has('bits-ready'), 'Do not hide or replay already readable text');
});

test('visibility and bfcache lifecycle stop frames and restore visible ambient effects', () => {
  for (const lifecycle of ['visibility', 'bfcache']) {
    const ui = setup();
    ui.intersect(ui.star);
    ui.card.fire('pointermove', pointer());
    if (lifecycle === 'visibility') { ui.document.hidden = true; ui.document.fire('visibilitychange'); }
    else ui.window.fire('pagehide');
    assert.equal(ui.frames.size, 0);
    assert.ok(!ui.star.classes.has('bits-inview'));
    assert.ok(!ui.root.classes.has('bits-active'));
    ui.card.fire('pointermove', pointer());
    assert.equal(ui.frames.size, 0);
    if (lifecycle === 'visibility') { ui.document.hidden = false; ui.document.fire('visibilitychange'); }
    else ui.window.fire('pageshow');
    assert.ok(ui.star.classes.has('bits-inview'));
  }
});

test('reduced motion and print lifecycle remain readable and do not override site preferences', () => {
  for (const lifecycle of ['reduce', 'print']) {
    const ui = setup();
    ui.intersect(ui.shiny);
    ui.card.fire('pointermove', pointer());
    if (lifecycle === 'reduce') ui.reduced.change(true);
    else ui.window.fire('beforeprint');
    assert.equal(ui.frames.size, 0);
    assert.equal(ui.root.dataset.motion, 'on', 'Only the main motion controller owns the preference');
    assert.ok(!ui.shiny.classes.has('bits-inview'));
    assert.ok(!ui.heading.classes.has('bits-ready'));
    if (lifecycle === 'reduce') ui.reduced.change(false);
    else ui.window.fire('afterprint');
    assert.ok(ui.shiny.classes.has('bits-inview'));
  }
});

test('a changed preference is rechecked before a scheduled pointer frame paints', () => {
  const ui = setup();
  ui.card.fire('pointermove', pointer());
  ui.root.dataset.motion = 'off';
  ui.flush();
  assert.ok(!ui.card.classes.has('bits-pointer-active'));
  assert.equal(ui.card.properties.size, 0);
});

test('glare uses the same lifecycle guard but does not write irrelevant spotlight variables', () => {
  const ui = setup();
  ui.glare.fire('pointerenter', pointer());
  ui.flush();
  assert.ok(ui.glare.classes.has('bits-pointer-active'));
  assert.equal(ui.glare.properties.size, 0);
  ui.glare.fire('pointerleave');
  assert.ok(!ui.glare.classes.has('bits-pointer-active'));
});

test('CSS gates ambient animation, preserves focus and separates layers from existing card transforms', () => {
  assert.match(css, /html\[data-motion="on"\]\.bits-active/);
  assert.match(css, /\[data-bits-star\]\.bits-inview/);
  assert.match(css, /\[data-bits-shiny\]\.bits-inview/);
  assert.match(css, /\[data-bits-spotlight\]:focus-within/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /forced-colors: active/);
  assert.match(css, /@media print/);
  assert.match(css, /\[data-bits-spotlight\] > \.card-sheen \{ display: none !important; \}/);
  assert.doesNotMatch(css, /\.floating-card\s*\{/);
  assert.doesNotMatch(css, /outline:\s*(?:none|0)/);
  assert.doesNotMatch(source, /setInterval|setTimeout|\.innerHTML/);
  assert.match(source, /MIT \+ Commons Clause/);
});

test('Bits headings are excluded from the legacy reveal controller', () => {
  assert.match(homepage, /\.section-heading:not\(\[data-bits-blur\]\)/);
  const enhancedHeadings = template.match(/<[^>]+\bdata-bits-blur\b[^>]*>/g) || [];
  assert.ok(enhancedHeadings.length >= 6);
  for (const heading of enhancedHeadings) assert.doesNotMatch(heading, /\bdata-reveal\b/);
});

test('spotlight layers outrank the later interest-card direct-child layout rule', () => {
  // _interests.scss is imported last and its existing content selector has
  // specificity (0,3,0). Both layer rules must win independently at (0,4,0).
  const selector = '.immersive-home [data-bits-spotlight] > .bits-spotlight-layer[aria-hidden]';
  assert.equal(css.split(selector).length - 1, 2);
  assert.ok(css.includes(selector + ','), 'Shared absolute positioning must outrank card content');
  assert.ok(css.includes(selector + ' {'), 'Full-card sizing must outrank card content');
});
