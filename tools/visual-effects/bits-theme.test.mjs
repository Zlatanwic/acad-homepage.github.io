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

test('homepage and reading layout exclude flight and scroll-driven effects', async () => {
  const landing = await read('_pages/about.md');
  const reading = await read('_layouts/susun.html');
  assert.match(landing, /^layout: susun$/m);
  assert.doesNotMatch(landing, /data-scene-chapter|data-compute-scene|data-reveal|data-bits|space-gateway|starmap/);
  assert.doesNotMatch(reading, /homepage\.js|bits\.js|compute-scene\.js|include scripts\.html|starmap/);
  assert.doesNotMatch(reading, /motion\.js|space-gateway\.js|space-scene\.js|include space-gateway\.html/);
  assert.match(reading, /\/assets\/js\/blog\.js/);
  const license = await read('assets/vendor/react-bits/LICENSE.md');
  assert.match(license, /Copyright \(c\) 2026 David Haz/);
  assert.match(license, /Commons Clause Restriction/);
});
