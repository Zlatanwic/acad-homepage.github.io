import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../../assets/js/legacy-routes.js', import.meta.url), 'utf8');

function setup({ hash = '', base = '/acad-homepage.github.io/', absent = false, hrefs = {} } = {}) {
  const listeners = new Map();
  const navigations = [];
  const links = Object.fromEntries(['profile', 'research', 'education', 'projects', 'interests', 'blog'].map((id) => [id, base + id + '/']));
  Object.assign(links, hrefs);
  const location = {
    href: 'https://example.com' + base + hash,
    origin: 'https://example.com', pathname: base, hash,
    replace(value) { navigations.push(value); }
  };
  const window = {
    location,
    addEventListener(type, handler) { listeners.set(type, handler); }
  };
  const gateway = {
    querySelector(selector) {
      const id = selector.match(/^\[data-destination="([a-z]+)"\]$/)?.[1];
      return id && Object.prototype.hasOwnProperty.call(links, id) ? { getAttribute: () => links[id] } : null;
    }
  };
  runInNewContext(source, { window, document: { querySelector: () => absent ? null : gateway }, URL });
  return {
    navigations, listeners, links, location,
    change(nextHash) {
      location.hash = nextHash;
      location.href = 'https://example.com' + base + nextHash;
      listeners.get('hashchange')?.();
    }
  };
}

test('every supported old bookmark maps to its independent archive and retained subsection', () => {
  const expectations = {
    'about-me': 'profile/',
    profile: 'profile/',
    contact: 'profile/#contact',
    'research-interests': 'research/',
    education: 'education/',
    'research-experience': 'education/#research-experience',
    news: 'education/#news',
    projects: 'projects/',
    publications: 'projects/#publications',
    'personal-interests': 'interests/'
  };
  for (const [hash, path] of Object.entries(expectations)) {
    assert.deepEqual(setup({ hash: '#' + hash }).navigations, ['https://example.com/acad-homepage.github.io/' + path], hash);
  }
});

test('redirect uses rendered link paths on a custom-domain site without a project prefix', () => {
  const run = setup({ hash: '#research-interests', base: '/' });
  assert.deepEqual(run.navigations, ['https://example.com/research/']);
});

test('rendered route URLs are authoritative rather than hard-coded project paths', () => {
  const run = setup({ hash: '#contact', hrefs: { profile: '/archives/personnel/' } });
  assert.deepEqual(run.navigations, ['https://example.com/archives/personnel/#contact']);
});

test('plain gateway arrival, the flight-deck anchor and unknown hashes do not redirect', () => {
  for (const hash of ['', '#', '#space-gateway', '#unknown', '#__proto__', '#constructor', '#toString', '#%E0%A4%A']) {
    assert.deepEqual(setup({ hash }).navigations, [], hash);
  }
});

test('legacy hash changes redirect after load, while unrelated changes are left alone', () => {
  const run = setup();
  run.change('#space-gateway');
  run.change('#unknown');
  assert.deepEqual(run.navigations, []);
  run.change('#education');
  assert.deepEqual(run.navigations, ['https://example.com/acad-homepage.github.io/education/']);
});

test('percent-encoded known hashes resolve safely', () => {
  assert.deepEqual(setup({ hash: '#research%2Dexperience' }).navigations, ['https://example.com/acad-homepage.github.io/education/#research-experience']);
});

test('the compatibility script does nothing on independent archive pages', () => {
  const run = setup({ hash: '#contact', absent: true });
  assert.deepEqual(run.navigations, []);
  assert.equal(run.listeners.size, 0);
});

test('missing, unsafe, external or same-document destination links never cause redirects', () => {
  for (const href of [null, '', '#profile', 'https://elsewhere.example/profile/', 'javascript:alert(1)', 'data:text/html,no', 'http://[invalid']) {
    assert.deepEqual(setup({ hash: '#profile', hrefs: { profile: href } }).navigations, [], String(href));
  }
  const run = setup();
  delete run.links.profile;
  run.change('#profile');
  assert.deepEqual(run.navigations, []);
});
