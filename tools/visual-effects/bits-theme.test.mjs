import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const theme = await read('_sass/_bits-theme.scss');

test('padded blog search controls override the legacy content-box reset', () => {
  assert.match(theme, /\.blog-controls input, \.blog-controls select\s*\{[^}]*box-sizing: border-box/);
  assert.match(theme, /\.blog-controls > div\s*\{\s*min-width: 0/);
});

test('interest print reset has sufficient specificity for the new card surface', () => {
  const print = theme.slice(theme.lastIndexOf('@media print'));
  assert.match(print, /\.immersive-home \.interests-grid \.interest-card/);
  assert.match(print, /\.immersive-home \.interests-grid \.interest-card\s*\{\s*display: block;/);
  assert.match(print, /background: #fff !important/);
  assert.match(print, /box-shadow: none/);
});

test('effects stay after the shared controller and out of the reading layout', async () => {
  const scripts = await read('_includes/scripts.html');
  const motionIndex = scripts.indexOf('/assets/js/motion.js');
  const homepageIndex = scripts.indexOf('/assets/js/homepage.js');
  const bitsIndex = scripts.indexOf('/assets/js/bits.js');
  assert.ok(motionIndex >= 0 && homepageIndex >= 0 && bitsIndex >= 0);
  assert.ok(bitsIndex > homepageIndex && homepageIndex > motionIndex);
  const blog = await read('_layouts/blog.html');
  assert.match(blog, /data-motion="off"/);
  assert.doesNotMatch(blog, /bits\.js|motion\.js|compute-scene\.js/);
  const license = await read('assets/vendor/react-bits/LICENSE.md');
  assert.match(license, /Copyright \(c\) 2026 David Haz/);
  assert.match(license, /Commons Clause Restriction/);
});
