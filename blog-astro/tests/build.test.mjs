import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('Astro builds only publishable Markdown and MDX posts, with dated URLs and a feed', async () => {
  // A nested temporary app finds the parent's installed dependencies but has its
  // own content cache and output, so fixture posts cannot leak into a real build.
  const temp = await mkdtemp(join(root, '.verify-'));
  assert.ok(temp.startsWith(root + sep));
  try {
    await cp(join(root, 'src'), join(temp, 'src'), { recursive: true });
    await cp(join(root, 'astro.config.mjs'), join(temp, 'astro.config.mjs'));
    await cp(join(root, 'package.json'), join(temp, 'package.json'));
    const fixtures = join(temp, 'fixture-posts');
    await mkdir(fixtures);
    await writeFile(join(fixtures, '2020-01-01-one.md'), `---\ntitle: "Systems & Notes"\ndescription: "First article"\ntags: [CUDA]\nseries: { name: "Systems", part: 1 }\n---\n## Hello\n\nFormula $x^2$.\n`);
    await writeFile(join(fixtures, '2020-02-02-two.mdx'), `---\ntitle: "中文笔记"\nlang: zh-CN\nseries: { name: "Systems", part: 2 }\n---\n## 公式\n\n$$\ny = x^2\n$$\n`);
    await writeFile(join(fixtures, '2020-03-03-hidden.md'), `---\ntitle: "Private fixture"\npublished: false\n---\nNot published.\n`);
    await writeFile(join(fixtures, '2999-01-01-future.md'), `---\ntitle: "Future fixture"\n---\nNot published.\n`);
    const result = spawnSync(process.execPath, [join(root, 'node_modules/astro/astro.js'), 'build', '--root', temp], {
      cwd: temp,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', ASTRO_BLOG_POSTS_DIR: './fixture-posts' },
      encoding: 'utf8', timeout: 120000
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = join(temp, 'dist/blog');
    const index = await readFile(join(output, 'index.html'), 'utf8');
    const first = await readFile(join(output, '2020/01/01/one/index.html'), 'utf8');
    const second = await readFile(join(output, '2020/02/02/two/index.html'), 'utf8');
    const feed = await readFile(join(output, 'feed.xml'), 'utf8');
    const data = JSON.parse(await readFile(join(output, 'index.json'), 'utf8'));
    assert.match(index, /Systems &amp; Notes/);
    assert.match(index, /中文笔记/);
    assert.match(index, /Series/);
    assert.match(first, /class="katex/);
    assert.match(second, /class="katex/);
    assert.match(first, /\/acad-homepage\.github\.io\/blog\/2020\/02\/02\/two\//);
    assert.match(feed, /xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/);
    assert.equal((feed.match(/<entry\b/g) || []).length, 2);
    assert.deepEqual(data.map(post => post.title), ['中文笔记', 'Systems & Notes']);
    for (const text of [index, feed, JSON.stringify(data)]) assert.doesNotMatch(text, /Private fixture|Future fixture/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
