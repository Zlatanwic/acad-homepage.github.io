import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../../assets/js/blog.js', import.meta.url), 'utf8');

class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.hidden = false;
    this.value = '';
    this.id = '';
    this.className = '';
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
    this.selectors = new Map();
    this.options = [];
    this.focused = false;
    this.text = '';
  }
  get textContent() { return this.text; }
  set textContent(value) { this.text = value; this.children = []; }
  get innerHTML() { throw new Error('HTML parsing is not part of this enhancement'); }
  set innerHTML(value) { throw new Error('Never inject search or heading values as HTML'); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  appendChild(child) { this.children.push(child); }
  querySelector(name) { return this.selectors.get(name) || null; }
  querySelectorAll(name) { return this.selectors.get(name) || []; }
  addEventListener(name, listener) {
    const listeners = this.listeners.get(name) || [];
    listeners.push(listener);
    this.listeners.set(name, listeners);
  }
  fire(name) {
    let prevented = false;
    for (const listener of this.listeners.get(name) || []) listener({ preventDefault() { prevented = true; } });
    return prevented;
  }
  focus() { this.focused = true; }
}

const entries = [
  { search: 'Distributed GPU training CUDA communication overlap', tags: ['GPU', 'Systems'] },
  { search: '中文笔记 推理优化 KV Cache Efficient AI', tags: ['Efficient AI', '中文'] },
  { search: 'Café compiler ＣＵＤＡ <script>alert(1)</script> C++ & R&D', tags: ['C++ & R&D', 'Systems'] }
];

function setup({ posts = entries, href = 'https://example.com/acad-homepage.github.io/blog/#posts', indexPresent = true,
  missing = [], headings = [], tocPresent = true, contentPresent = true, loading = false, urlSupport = true, historyThrows = false,
  execute = true } = {}) {
  const document = new Element();
  document.readyState = loading ? 'loading' : 'complete';
  const window = new Element();
  window.URL = urlSupport ? URL : undefined;
  window.location = new URL(href);
  const historyCalls = [];
  window.history = {
    state: { retained: true },
    replaceState(state, title, next) {
      if (historyThrows) throw new Error('History write denied');
      historyCalls.push({ state, title, next });
      window.location = new URL(next, window.location);
    }
  };
  const index = new Element();
  const controls = new Element();
  controls.hidden = true;
  const search = new Element('input');
  const tag = new Element('select');
  const status = new Element();
  const empty = new Element();
  empty.hidden = true;
  const reset = new Element('button');
  const cards = posts.map((post) => {
    const card = new Element('article');
    card.setAttribute('data-search', post.search);
    card.setAttribute('data-tags', post.rawTags ?? JSON.stringify(post.tags));
    return card;
  });
  tag.options = ['', ...new Set(posts.flatMap((post) => post.tags || []))].map((value) => ({ value }));
  index.selectors = new Map([
    ['[data-blog-controls]', controls], ['#blog-search', search], ['#blog-tag', tag],
    ['[data-blog-status]', status], ['[data-blog-no-results]', empty], ['[data-blog-card]', cards], ['[data-blog-reset]', [reset]]
  ]);
  for (const selector of missing) index.selectors.delete(selector);

  const content = new Element('article');
  const headingElements = headings.map(({ level = 'h2', id = '', title = '' }) => {
    const heading = new Element(level);
    heading.id = id;
    heading.textContent = title;
    return heading;
  });
  content.selectors.set('h2[id], h3[id]', headingElements);
  const toc = new Element('aside');
  toc.hidden = true;
  const tocList = new Element('ol');
  toc.selectors.set('[data-blog-toc-list]', tocList);
  document.selectors.set('[data-blog-index]', indexPresent ? index : null);
  document.selectors.set('[data-blog-toc]', tocPresent ? toc : null);
  document.getElementById = (id) => id === 'post-content' && contentPresent ? content : null;
  document.createElement = (name) => new Element(name);
  function run() { runInNewContext(source, { document, window }); }
  if (execute) run();
  return { document, window, index, controls, search, tag, status, empty, reset, cards, toc, tocList, historyCalls, run,
    visible: () => cards.map((card, i) => card.hidden ? null : i).filter((i) => i !== null),
    query(value) { search.value = value; search.fire('input'); },
    topic(value) { tag.value = value; tag.fire('change'); }
  };
}

test('without JavaScript all server-rendered posts remain visible and nonfunctional controls stay hidden', () => {
  const run = setup({ execute: false });
  assert.deepEqual(run.visible(), [0, 1, 2]);
  assert.equal(run.controls.hidden, true);
  assert.equal(run.empty.hidden, true);
  assert.equal(run.toc.hidden, true);
});

test('blog initializes from deferred or DOMContentLoaded scripts, once per index', () => {
  const run = setup({ loading: true });
  assert.equal(run.controls.hidden, true);
  run.document.fire('DOMContentLoaded');
  assert.equal(run.controls.hidden, false);
  assert.equal(run.status.textContent, 'Showing 3 of 3 posts.');
  run.run();
  run.document.fire('DOMContentLoaded');
  assert.equal(run.search.listeners.get('input').length, 1);
});

test('index enhancement is inert on other pages and fails open with incomplete controls', () => {
  assert.doesNotThrow(() => setup({ indexPresent: false, tocPresent: false }));
  for (const selector of ['[data-blog-controls]', '#blog-search', '#blog-tag']) {
    const run = setup({ missing: [selector], href: 'https://example.com/blog/?q=unmatched' });
    assert.deepEqual(run.visible(), [0, 1, 2]);
    assert.equal(run.controls.hidden, true);
  }
});

test('an empty archive keeps filters and no-results hidden, leaving the publishing empty state intact', () => {
  const run = setup({ posts: [] });
  assert.equal(run.controls.hidden, true);
  assert.equal(run.empty.hidden, true);
  assert.equal(run.status.textContent, 'No posts published yet.');
  assert.equal(run.historyCalls.length, 0);
});

test('search matches every whitespace-separated term, case-insensitively and in any order', () => {
  const run = setup();
  run.query('  OVERLAP\tGpu\ntraining  ');
  assert.deepEqual(run.visible(), [0]);
  run.query('gpu nonexistent');
  assert.deepEqual(run.visible(), []);
  assert.equal(run.empty.hidden, false);
  assert.equal(run.status.textContent, 'Showing 0 of 3 posts.');
  run.query('  \n\t ');
  assert.deepEqual(run.visible(), [0, 1, 2]);
  assert.equal(run.empty.hidden, true);
});

test('Unicode search supports Chinese, canonical accents, and full-width Latin characters', () => {
  const run = setup();
  run.query('中文 推理优化');
  assert.deepEqual(run.visible(), [1]);
  run.query('cafe\u0301 cuda');
  assert.deepEqual(run.visible(), [2]);
  run.query('ＣＵＤＡ');
  assert.deepEqual(run.visible(), [0, 2]);
});

test('tag filtering uses exact tags, including punctuation, and combines with search', () => {
  const run = setup();
  run.topic('Systems');
  assert.deepEqual(run.visible(), [0, 2]);
  run.query('compiler');
  assert.deepEqual(run.visible(), [2]);
  run.topic('C++ & R&D');
  assert.deepEqual(run.visible(), [2]);
  run.topic('systems');
  assert.deepEqual(run.visible(), []);
  run.topic('');
  assert.deepEqual(run.visible(), [2]);
});

test('malformed or unexpected tag metadata never crashes or hides unfiltered cards', () => {
  const posts = [
    { search: 'one', rawTags: '{broken', tags: [] },
    { search: 'two', rawTags: '{"tag":"GPU"}', tags: [] },
    { search: 'three', rawTags: '[null,3,"GPU"]', tags: ['GPU'] }
  ];
  const run = setup({ posts });
  assert.deepEqual(run.visible(), [0, 1, 2]);
  run.topic('GPU');
  assert.deepEqual(run.visible(), [2]);
});

test('query parameters restore initial filters without changing the URL or accepting unknown tags', () => {
  const run = setup({ href: 'https://example.com/blog/?q=compiler&tag=C%2B%2B+%26+R%26D#posts' });
  assert.deepEqual(run.visible(), [2]);
  assert.equal(run.search.value, 'compiler');
  assert.equal(run.tag.value, 'C++ & R&D');
  assert.equal(run.historyCalls.length, 0);
  const unknown = setup({ href: 'https://example.com/blog/?tag=%3Cscript%3E' });
  assert.equal(unknown.tag.value, '');
  assert.deepEqual(unknown.visible(), [0, 1, 2]);
});

test('query updates safely encode user text, preserve base path, fragment, other parameters and history state', () => {
  const run = setup({ href: 'https://example.com/acad-homepage.github.io/blog/?campaign=hello%20world#posts' });
  run.query('<script>alert(1)</script>');
  assert.deepEqual(run.visible(), [2]);
  run.topic('C++ & R&D');
  assert.equal(run.window.location.pathname, '/acad-homepage.github.io/blog/');
  assert.equal(run.window.location.hash, '#posts');
  assert.equal(run.window.location.searchParams.get('campaign'), 'hello world');
  assert.equal(run.window.location.searchParams.get('q'), '<script>alert(1)</script>');
  assert.equal(run.window.location.searchParams.get('tag'), 'C++ & R&D');
  assert.equal(run.historyCalls.at(-1).state, run.window.history.state);
  assert.equal(run.historyCalls.at(-1).next.includes('<script>'), false);
  const count = run.historyCalls.length;
  run.search.fire('input');
  assert.equal(run.historyCalls.length, count);
});

test('reset clears both filters, removes only blog query parameters, and returns focus to search', () => {
  const run = setup({ href: 'https://example.com/blog/?q=compiler&tag=Systems&ref=profile#posts' });
  assert.equal(run.reset.fire('click'), true);
  assert.equal(run.search.value, '');
  assert.equal(run.tag.value, '');
  assert.deepEqual(run.visible(), [0, 1, 2]);
  assert.equal(run.search.focused, true);
  assert.equal(run.window.location.search, '?ref=profile');
  assert.equal(run.window.location.hash, '#posts');
});

test('popstate restores query and tag state without another history write', () => {
  const run = setup();
  run.query('training');
  const count = run.historyCalls.length;
  run.window.location = new URL('https://example.com/blog/?q=中文&tag=中文#posts');
  run.window.fire('popstate');
  assert.deepEqual(run.visible(), [1]);
  assert.equal(run.search.value, '中文');
  assert.equal(run.tag.value, '中文');
  assert.equal(run.historyCalls.length, count);
  run.window.location = new URL('https://example.com/blog/');
  run.window.fire('popstate');
  assert.deepEqual(run.visible(), [0, 1, 2]);
});

test('missing URL support and denied history writes do not prevent local filtering', () => {
  for (const options of [{ urlSupport: false }, { historyThrows: true }]) {
    const run = setup(options);
    assert.doesNotThrow(() => run.query('training'));
    assert.deepEqual(run.visible(), [0]);
    assert.doesNotThrow(() => run.reset.fire('click'));
    assert.deepEqual(run.visible(), [0, 1, 2]);
  }
});

test('status uses singular post grammar and optional status/no-results elements are safe', () => {
  const single = setup({ posts: entries.slice(0, 1) });
  assert.equal(single.status.textContent, 'Showing 1 of 1 post.');
  const run = setup({ missing: ['[data-blog-status]', '[data-blog-no-results]', '[data-blog-reset]'] });
  assert.doesNotThrow(() => run.query('absent'));
  assert.deepEqual(run.visible(), []);
});

test('TOC uses safe text labels, encoded native fragment links, and h3 indentation', () => {
  const run = setup({ indexPresent: false, headings: [
    { id: 'architecture', title: '  Architecture  ' },
    { level: 'h3', id: '推理 & cache/#', title: '<img src=x onerror=alert(1)>' },
    { id: 'empty', title: ' \n ' },
    { title: 'No anchor' }
  ] });
  assert.equal(run.toc.hidden, false);
  assert.equal(run.tocList.children.length, 2);
  const [first, second] = run.tocList.children;
  assert.equal(first.children[0].textContent, 'Architecture');
  assert.equal(first.children[0].getAttribute('href'), '#architecture');
  assert.equal(second.className, 'blog-toc-subitem');
  assert.equal(second.children[0].textContent, '<img src=x onerror=alert(1)>');
  assert.equal(second.children[0].getAttribute('href'), '#' + encodeURIComponent('推理 & cache/#'));
  assert.equal(second.children[0].listeners.size, 0);
  run.run();
  assert.equal(run.tocList.children.length, 2);
});

test('TOC stays hidden on pages without headings or post content', () => {
  for (const options of [{ headings: [] }, { contentPresent: false }, { tocPresent: false },
    { headings: [{ id: 'empty', title: ' ' }, { id: '\uD800', title: 'Malformed anchor' }] }]) {
    const run = setup(options);
    assert.equal(run.toc.hidden, true);
    assert.equal(run.tocList.children.length, 0);
  }
});
