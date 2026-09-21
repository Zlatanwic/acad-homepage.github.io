import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const css = await readFile(new URL('../../_sass/_dossier.scss', import.meta.url), 'utf8');
const hud = await readFile(new URL('../../_sass/_dossier-hud.scss', import.meta.url), 'utf8');
const luminance = (hex) => {
  const c = hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

test('archive syntax tokens override the legacy light theme and remain legible in print', () => {
  assert.match(css, /\.post-content \.highlight span\[class\]\s*\{\s*color: inherit; background: transparent;/);
  assert.match(css, /\.post-content pre\s*\{\s*background: var\(--archive-panel\);/);
  assert.match(css, /\.post-content pre\.highlight\s*\{\s*background: var\(--archive-panel\); border:/);
  assert.match(css, /\.highlight span\.k[^}]*color: var\(--archive-accent\)/);
  assert.match(css, /\.post-content pre code\s*\{\s*color: var\(--archive-ink\);/);
  assert.match(css, /\.post-content pre code\s*\{[^}]*font: 13px\/1\.8/);
  assert.match(css, /\.post-content thead\s*\{\s*background: var\(--archive-panel\); color: var\(--archive-ink\);/);
  assert.match(css, /div\.highlighter-rouge::before[^}]*display: none/);
  const dark = css.slice(0, css.indexOf('@media print'));
  const print = css.slice(css.indexOf('@media print'));
  for (const palette of [dark, print]) {
    const background = palette.match(/--archive-panel:\s*(#[a-f\d]{3,6})/i)[1];
    const expand = v => v.length === 4 ? '#' + [...v.slice(1)].map(c => c + c).join('') : v;
    for (const key of ['ink', 'muted', 'accent']) {
      const color = palette.match(new RegExp(`--archive-${key}:\\s*(#[a-f\\d]{3,6})`, 'i'))[1];
      assert.ok(contrast(expand(color), expand(background)) >= 4.5, `${key} must reach 4.5:1 in each palette`);
    }
  }
});

test('archive is normal document flow with native focus and actual blog TOC classes', () => {
  assert.match(css, /\.blog-toc-subitem\s*\{\s*margin-left:/);
  assert.doesNotMatch(css, /\.toc-subheading/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(css, /position:\s*(?:fixed|sticky)|scroll-snap|animation:/);
  assert.match(css, /text-wrap:\s*balance/);
  assert.match(css, /text-wrap:\s*pretty/);
});

test('HUD enhancement is scoped, responsive, and never introduces scroll-driven or looping motion', () => {
  assert.match(hud, /\.dossier-hud\s*\{/);
  assert.doesNotMatch(hud, /position:\s*(?:fixed|sticky)|scroll-snap|\binfinite\b|backdrop-filter|will-change/);
  assert.match(hud, /html\[data-motion='subtle'\]\s*\{\s*scroll-behavior: auto/);
  assert.match(hud, /@media \(prefers-reduced-motion: no-preference\)/);
  const animated = hud.slice(hud.indexOf('@media (prefers-reduced-motion: no-preference)'), hud.indexOf('@media (max-width: 1150px)'));
  assert.match(animated, /\.dossier-instrument \.dossier-emblem-core[^}]*animation: dossier-instrument-in 200ms ease-out both/);
  assert.doesNotMatch(animated, /\.dossier-body|\.dossier-copy|\.post-content|\binfinite\b/);
  assert.match(hud, /@media \(max-width: 720px\)/);
  assert.match(hud, /@media print/);
  assert.match(hud, /\.dossier-section-nav[^}]*display: flex/);
});

test('the vector illustrations are decorative and do not add external media or runtime dependencies', async () => {
  const emblem = await readFile(new URL('../../_includes/dossier-emblem.html', import.meta.url), 'utf8');
  assert.match(emblem, /<svg[^>]*aria-hidden="true"[^>]*focusable="false"/);
  assert.doesNotMatch(emblem, /<script|<foreignObject|<image|https?:\/\//);
  for (const kind of ['profile', 'research', 'education', 'projects', 'interests']) {
    assert.ok(emblem.includes(`when '${kind}'`));
  }
});
