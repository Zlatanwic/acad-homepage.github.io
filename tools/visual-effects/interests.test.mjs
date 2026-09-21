import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { test } from 'node:test';

const readSource = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const [interests, navigation, configuration, stylesheet, mainStylesheet, ...academicPages] = await Promise.all([
  readSource('_pages/interests.html'),
  readSource('_data/navigation.yml'),
  readSource('_config.yml'),
  readSource('_sass/_interests.scss'),
  readSource('assets/css/main.scss'),
  ...['profile', 'research', 'education', 'projects'].map((name) => readSource(`_pages/${name}.html`))
]);

const academic = academicPages.join('\n');
const text = (markup) => markup.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|’/g, "'").replace(/\s+/g, ' ').trim();
const classNames = (attributes) => attributes.match(/\bclass="([^"]*)"/)?.[1].split(/\s+/) || [];
const attribute = (attributes, name) => attributes.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const interestImages = () => [...interests.matchAll(/<img\b([^>]*)>/g)].map((match) => match[1]);
const localAsset = (value) => value?.match(/^\{\{\s*'(\/images\/interests\/(?:football|games|albums)\/[a-z0-9-]+\.(?:jpg|webp))'\s*\|\s*relative_url\s*\}\}$/)?.[1];

test('personal interests are an independent dossier with three labelled, accessible photo groups', () => {
  assert.match(interests, /^layout: dossier$/m);
  assert.match(interests, /^permalink: \/interests\/$/m);
  assert.match(interests, /\bid="personal-interests"/);
  assert.doesNotMatch(interests, /data-reveal|data-bits|data-scene|floating-card|paper-chapter/);

  const sections = [...interests.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g)];
  assert.equal(sections.length, 3);
  const galleries = ['football', 'games', 'albums'];
  for (const [index, [, attributes, body]] of sections.entries()) {
    assert.ok(classNames(attributes).includes('dossier-gallery-section'));
    const headingId = attribute(attributes, 'aria-labelledby');
    assert.ok(headingId, 'each theme section needs a heading association');
    assert.match(body, new RegExp(`<h2\\b[^>]*\\bid="${headingId}"[^>]*>`));
    const art = body.match(/<[^>]+\bclass="[^"]*\bdossier-media-grid\b[^"]*"[^>]*>/);
    assert.ok(art, 'each interest has a photo gallery');
    assert.ok(classNames(art[0]).includes(`dossier-media-grid--${galleries[index]}`));
    assert.equal(attribute(art[0], 'role'), 'group');
    assert.ok(attribute(art[0], 'aria-label')?.trim(), 'photo groups need an accessible name');
    assert.doesNotMatch(art[0], /aria-hidden="true"/, 'meaningful photos must be exposed to assistive technology');
  }
});

test('all eleven interest images are local, present, labelled, and lazy loaded with reserved dimensions', async () => {
  const images = interestImages();
  assert.equal(images.length, 11);
  const counts = { football: 0, games: 0, albums: 0 };
  const paths = new Set();
  let totalBytes = 0;
  for (const attributes of images) {
    const path = localAsset(attribute(attributes, 'src'));
    assert.ok(path, 'photo URLs must use local assets and the Jekyll base URL');
    assert.ok(!paths.has(path), `image should appear once: ${path}`);
    paths.add(path);
    counts[path.split('/')[3]] += 1;
    assert.ok(attribute(attributes, 'alt')?.trim(), `${path} needs descriptive alternative text`);
    assert.equal(attribute(attributes, 'loading'), 'lazy');
    assert.equal(attribute(attributes, 'decoding'), 'async');
    for (const dimension of ['width', 'height']) {
      const value = Number(attribute(attributes, dimension));
      assert.ok(Number.isInteger(value) && value > 0, `${path} needs a positive ${dimension}`);
    }
    const file = await stat(new URL(`../../${path.slice(1)}`, import.meta.url));
    assert.ok(file.isFile() && file.size > 0, `${path} must exist and contain image data`);
    totalBytes += file.size;
  }
  assert.deepEqual(counts, { football: 3, games: 2, albums: 6 });
  assert.ok(totalBytes < 2_000_000, `gallery images must stay below 2 MB; found ${totalBytes} bytes`);
});

test('photos depict every requested footballer, game character, and album artist', () => {
  const descriptions = interestImages().map((attributes) => text(attribute(attributes, 'alt') || ''));
  for (const subject of [/Erling Haaland/, /Kevin De Bruyne/, /Rodri/, /Grace Ashcroft/, /Arthur Morgan/, /Oasis/, /Stereophonics/, /Blur/, /Queen/, /Guns\s*N'?\s*Roses/i, /Suede/]) {
    assert.ok(descriptions.some((description) => subject.test(description)), `image missing: ${subject}`);
  }
  assert.ok(descriptions.some((description) => /Grace Ashcroft/.test(description) && /Resident Evil Requiem/.test(description)));
  assert.ok(descriptions.some((description) => /Arthur Morgan/.test(description) && /Red Dead Redemption 2/.test(description)));
});

test('each photograph opens the same local asset safely and announces its new tab', () => {
  const links = [...interests.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  const photoLinks = links.filter(([, , body]) => /<img\b/.test(body));
  assert.equal(photoLinks.length, 11);
  for (const [, attributes, body] of photoLinks) {
    const imageAttributes = body.match(/<img\b([^>]*)>/)[1];
    assert.equal(attribute(attributes, 'href'), attribute(imageAttributes, 'src'));
    assert.equal(attribute(attributes, 'target'), '_blank');
    assert.match(attribute(attributes, 'aria-label') || '', /opens in a new tab/i);
  }
  for (const [, attributes] of links) {
    if (attribute(attributes, 'target') !== '_blank') continue;
    const rel = (attribute(attributes, 'rel') || '').split(/\s+/);
    assert.ok(rel.includes('noopener') && rel.includes('noreferrer'), 'new-tab links must isolate the opener and referrer');
  }
});

test('image credits are a native disclosure with verified attribution, source links, and complete source notes', async () => {
  const disclosures = [...interests.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)];
  const credits = disclosures.filter(([, attributes]) => classNames(attributes).includes('dossier-credits'));
  assert.equal(credits.length, 1, 'one native image-credits disclosure must remain available');
  const [, attributes, body] = credits[0];
  assert.doesNotMatch(attributes, /\bhidden(?:\s|=|$)|aria-hidden="true"/);
  const summary = body.match(/^\s*<summary\b([^>]*)>([\s\S]*?)<\/summary>/);
  assert.ok(summary, 'the native summary is the first disclosure child');
  assert.equal(text(summary[2]), 'Image credits & sources');
  assert.doesNotMatch(summary[1], /tabindex="-1"|aria-hidden="true"/);

  const hrefs = new Set([...body.matchAll(/<a\b([^>]*)>/g)].map(([, attributes]) => attribute(attributes, 'href')));
  for (const url of [
    'https://commons.wikimedia.org/wiki/File:Erling-Haaland-2023.jpg',
    'https://commons.wikimedia.org/wiki/File:Yokohama_F._Marinos_-_Manchester_City_(3-5)_-_53075487835_(Rodri)_(cropped).jpg',
    'https://commons.wikimedia.org/wiki/File:2021-12-07_Fu%C3%9Fball,_M%C3%A4nner,_UEFA_Champions_League,_RB_Leipzig_-_Manchester_City_FC_1DX_2723_by_Stepro_(cropped).jpg',
    'https://creativecommons.org/licenses/by-sa/2.0/',
    'https://creativecommons.org/licenses/by-sa/4.0/',
    'https://www.capcom.co.jp/ir/english/data/oar/2025/re-requiem.html',
    'https://store.rockstargames.com/game/buy-red-dead-redemption-2',
    'https://oasisinet.com/music-category/albums/',
    'https://www.stereophonics.com/',
    'https://blur.lnk.to/Parklife',
    'https://www.queenonline.com/music',
    'https://shop.universalmusic.it/products/guns-n-roses-appetite-for-destruction-vinile',
    'https://www.suede.co.uk/homepage/'
  ]) {
    assert.ok(hrefs.has(url), `credit source link missing: ${url}`);
  }
  const creditText = text(body);
  for (const attribution of ['pantkiewicz', 'Patryk Antkiewicz', 'Steffen Prößdorf', 'CC BY-SA 2.0', 'CC BY-SA 4.0', 'NullReason', 'Guyrichtheman', 'PFHLai']) {
    assert.ok(creditText.includes(attribution), `photograph attribution missing: ${attribution}`);
  }
  assert.match(creditText, /Files unchanged; gallery framing crops their display/);
  assert.match(creditText, /No endorsement is implied/);

  for (const category of ['football', 'games', 'albums']) {
    const path = `images/interests/${category}/SOURCES.md`;
    assert.ok(hrefs.has(`{{ '/${path}' | relative_url }}`), `public notes link missing: ${category}`);
    assert.ok((await readSource(path)).trim().length > 0, `${path} must contain the full source notes`);
  }
});

test('football, AAA games, and rock favorites preserve every user-supplied interest', () => {
  assert.match(text(interests), /Manchester City/);
  assert.match(text(interests), /devoted Manchester City supporter/);
  const lists = [...interests.matchAll(/<ul\b[^>]*\bclass="[^"]*\bdossier-tags\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/g)];
  assert.ok(lists.length >= 1, 'game favorites remain a semantic list');
  const favorites = lists.flatMap((list) => [...list[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((item) => text(item[1])));
  const captions = [...interests.matchAll(/<span\b[^>]*\bclass="dossier-caption"[^>]*>([\s\S]*?)<\/span>/g)];
  favorites.push(...captions.map((caption) => text(caption[1])));
  for (const name of [/Resident Evil/i, /Cyberpunk 2077/i, /Grand Theft Auto|\bGTA\b/i, /Hitman/i, /Oasis/, /Stereophonics/, /Blur/, /Queen/, /Guns\s*(?:N'?|&)?\s*Roses/i, /Suede/]) {
    assert.ok(favorites.some((item) => name.test(item)), `favorite missing: ${name}`);
  }
});

test('Beyond Research navigation opens its independent page instead of a homepage chapter', () => {
  const paths = [...navigation.matchAll(/url:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(paths.filter((path) => path === '/interests/').length, 1);
  assert.match(navigation, /title:\s*"Beyond Research"\s+url:\s*"\/interests\/"/);
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.every((path) => path.startsWith('/') && !path.includes('#')), 'navigation targets independent documents');
  assert.equal((interests.match(/\bid="personal-interests"/g) || []).length, 1);
});

test('adding personal interests preserves academic content, CV, and both contact addresses', () => {
  assert.match(academic, /href="\{\{ site\.author\.cv \| relative_url \}\}"/);
  assert.match(configuration, /cv\s*:\s*"\/files\/Li_Kuo_CV\.pdf"/);
  assert.match(configuration, /email\s*:\s*"2353113@tongji\.edu\.cn"/);
  assert.match(configuration, /email_secondary\s*:\s*"rodebiau9320@gmail\.com"/);
  assert.match(academic, /href="mailto:\{\{ site\.author\.email \}\}"/);
  assert.match(academic, /href="mailto:\{\{ site\.author\.email_secondary \}\}"/);
  assert.match(academic, /Major rank<\/dt><dd><strong>4\s*\/\s*40<\/strong>/);
  assert.match(academic, /2027<\/span><span class="dossier-label">Incoming/);
  for (const url of ['https://madsys.cs.tsinghua.edu.cn/author/yongwei-wu/', 'https://madsys.cs.tsinghua.edu.cn/author/mingxing-zhang/', 'https://madsys.cs.tsinghua.edu.cn/', 'https://bochen.info/']) {
    assert.ok(academic.includes(`href="${url}"`), `academic link changed: ${url}`);
  }
  assert.equal((academicPages[1].match(/<article class="dossier-panel">/g) || []).length, 4);
  assert.doesNotMatch(academic, /\bGPA\b|Honors and Awards/);
});

test('dossier galleries are static while retained legacy photo animations remain opt-in and visibility-gated', () => {
  assert.match(mainStylesheet, /@import\s+"interests";\s*$/);
  assert.match(mainStylesheet, /@import\s+"dossier";/);
  assert.doesNotMatch(interests, /class="[^"]*\b(?:interest-card|floating-card)\b|data-reveal|data-scene|data-bits/);
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
  assert.equal(animationCount, 3, 'photos and record artwork use exactly three opt-in animation declarations');
  assert.match(stylesheet, /@media\s*\(max-width:/, 'interest cards include a narrow-screen layout');
});
