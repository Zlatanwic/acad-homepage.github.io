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

test('independent reading layouts exclude scroll-driven effects and flight is confined to the gateway', async () => {
  const deck = await read('_layouts/flight-deck.html');
  const landing = await read('_pages/about.md');
  const dossier = await read('_layouts/dossier.html');
  const blog = await read('_layouts/blog.html');
  const motionIndex = deck.indexOf('/assets/js/motion.js');
  const flightIndex = deck.indexOf('/assets/js/space-gateway.js');
  assert.ok(motionIndex >= 0 && flightIndex > motionIndex, 'shared motion preference initializes before the flight controller');
  assert.match(landing, /^layout: flight-deck$/m);
  assert.match(landing, /include space-gateway\.html/);
  assert.doesNotMatch(landing, /data-scene-chapter|data-compute-scene|data-reveal|data-bits/);
  for (const layout of [deck, dossier, blog]) {
    assert.doesNotMatch(layout, /homepage\.js|bits\.js|compute-scene\.js|include scripts\.html/);
  }
  for (const layout of [dossier, blog]) {
    assert.doesNotMatch(layout, /motion\.js|space-gateway\.js|space-scene\.js|include space-gateway\.html/);
  }
  assert.match(blog, /data-motion="off"/);
  assert.match(blog, /\/assets\/js\/blog\.js/);
  const license = await read('assets/vendor/react-bits/LICENSE.md');
  assert.match(license, /Copyright \(c\) 2026 David Haz/);
  assert.match(license, /Commons Clause Restriction/);
});
