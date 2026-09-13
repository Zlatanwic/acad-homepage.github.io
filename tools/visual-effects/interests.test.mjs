import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const readSource = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const [about, navigation, configuration, stylesheet, mainStylesheet] = await Promise.all([
  readSource('_pages/about.md'),
  readSource('_data/navigation.yml'),
  readSource('_config.yml'),
  readSource('_sass/_interests.scss'),
  readSource('assets/css/main.scss')
]);

const section = about.match(/<section\b([^>]*\bid="personal-interests"[^>]*)>([\s\S]*?)<\/section>/);
const text = (markup) => markup.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|’/g, "'").replace(/\s+/g, ' ').trim();
const classNames = (attributes) => attributes.match(/\bclass="([^"]*)"/)?.[1].split(/\s+/) || [];

test('personal interests are a labelled chapter with three accessible motion cards', () => {
  assert.ok(section, 'the personal interests section must exist');
  assert.ok(classNames(section[1]).includes('interests-chapter'));
  assert.ok(classNames(section[1]).includes('paper-chapter'));
  assert.match(section[1], /aria-labelledby="interests-title"/);
  assert.match(section[2], /<h2\b[^>]*\bid="interests-title"[^>]*>/);

  const cards = [...section[2].matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length, 3);
  for (const [, attributes, body] of cards) {
    assert.ok(classNames(attributes).includes('interest-card'));
    assert.ok(classNames(attributes).includes('floating-card'), 'use the existing tilt/lifecycle controller');
    assert.match(attributes, /\bdata-reveal(?:\s|=|$)/);
    assert.match(body, /<h3\b[^>]*>[^]*?<\/h3>/);
    const art = body.match(/<[^>]+\bclass="[^"]*\binterest-art\b[^"]*"[^>]*>/);
    assert.ok(art, 'each interest has a decorative illustration');
    assert.match(art[0], /aria-hidden="true"/);
  }
});

test('football, AAA games, and rock favorites preserve every user-supplied interest', () => {
  assert.ok(section);
  assert.match(text(section[2]), /Manchester City/);
  const lists = [...section[2].matchAll(/<ul\b[^>]*\bclass="[^"]*\binterest-favorites\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/g)];
  assert.ok(lists.length >= 2, 'games and bands remain semantic lists');
  const favorites = lists.flatMap((list) => [...list[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((item) => text(item[1])));
  for (const name of [/Resident Evil/i, /Cyberpunk 2077/i, /Grand Theft Auto|\bGTA\b/i, /Hitman/i, /Oasis/, /Stereophonics/, /Blur/, /Queen/, /Guns\s*(?:N'?|&)?\s*Roses/i, /Suede/]) {
    assert.ok(favorites.some((item) => name.test(item)), `favorite missing: ${name}`);
  }
});

test('Beyond Research navigation resolves once and follows the document order before contact', () => {
  const anchors = [...navigation.matchAll(/url:\s*"(#[^"]+)"/g)].map((match) => match[1]);
  assert.equal(anchors.filter((hash) => hash === '#personal-interests').length, 1);
  assert.match(navigation, /title:\s*"Beyond Research"\s+url:\s*"#personal-interests"/);
  assert.equal(new Set(anchors).size, anchors.length);
  const positions = anchors.map((hash) => {
    const targets = [...about.matchAll(new RegExp(`\\bid="${hash.slice(1)}"`, 'g'))];
    assert.equal(targets.length, 1, `${hash} must resolve to one unique target`);
    return targets[0].index;
  });
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  assert.ok(about.indexOf('id="publications"') < section.index);
  assert.ok(section.index < about.indexOf('id="contact"'));
  assert.match(about.slice(about.indexOf('id="contact"')), /06\s*\/\s*WHAT'S NEXT\?/);
});

test('adding personal interests preserves academic content, CV, and both contact addresses', () => {
  assert.match(about, /href="\{\{ site\.author\.cv \| relative_url \}\}"/);
  assert.match(configuration, /cv\s*:\s*"\/files\/Li_Kuo_CV\.pdf"/);
  assert.match(configuration, /email\s*:\s*"2353113@tongji\.edu\.cn"/);
  assert.match(configuration, /email_secondary\s*:\s*"rodebiau9320@gmail\.com"/);
  assert.match(about, /href="mailto:\{\{ site\.author\.email \}\}"/);
  assert.match(about, /href="mailto:\{\{ site\.author\.email_secondary \}\}"/);
  assert.match(about, /MAJOR RANK\s*<strong>4\s*\/\s*40<\/strong>/);
  assert.match(about, /2027<span class="mono">INCOMING/);
  for (const url of ['https://madsys.cs.tsinghua.edu.cn/author/yongwei-wu/', 'https://madsys.cs.tsinghua.edu.cn/author/mingxing-zhang/', 'https://madsys.cs.tsinghua.edu.cn/', 'https://bochen.info/']) {
    assert.ok(about.includes(`href="${url}"`), `academic link changed: ${url}`);
  }
  assert.equal((about.match(/class="research-panel floating-card"/g) || []).length, 4);
});

test('interest artwork animation only runs for opted-in, in-view cards without reduced motion', () => {
  assert.match(mainStylesheet, /@import\s+"interests";\s*$/);
  // Follow SCSS block ancestry rather than depending on a particular nesting style.
  // Motion-off / print reset declarations are allowed outside the opt-in blocks.
  const cleaned = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const ancestors = [];
  let start = 0;
  let animationCount = 0;
  for (let index = 0; index < cleaned.length; index += 1) {
    const delimiter = cleaned[index];
    if (!['{', '}', ';'].includes(delimiter)) continue;
    const fragment = cleaned.slice(start, index).trim();
    if (delimiter === '{') ancestors.push(fragment);
    else if (delimiter === '}') ancestors.pop();
    else if (/^animation(?:-[\w-]+)?\s*:/.test(fragment) && !/\b(?:none|paused)\b/.test(fragment)) {
      const scope = ancestors.join(' ');
      assert.match(scope, /@media\s*\(prefers-reduced-motion:\s*no-preference\)/);
      assert.match(scope, /html\[data-motion=["']?on["']?\]/);
      assert.match(scope, /\.immersive-home/);
      assert.match(scope, /\.interest-card\.is-inview/);
      animationCount += 1;
    }
    start = index + 1;
  }
  assert.ok(animationCount >= 3, 'each of the three illustrations has an opt-in animation');
  assert.match(stylesheet, /@media\s*\(max-width:/, 'interest cards include a narrow-screen layout');
});
