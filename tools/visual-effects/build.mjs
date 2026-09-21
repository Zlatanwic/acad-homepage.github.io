import { build } from 'esbuild';
import { copyFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
for (const scene of ['compute-scene', 'space-scene']) {
  const output = resolve(root, `assets/js/${scene}.js`);
  const title = scene === 'compute-scene' ? 'compute scene' : 'space scene';
  await build({
    entryPoints: [resolve(root, `assets/js/src/${scene}.js`)],
    outfile: output,
    nodePaths: [resolve(here, 'node_modules')],
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    legalComments: 'inline',
    banner: { js: `/* Optional ${title}. Three.js MIT license: ${scene}.LICENSE.txt */` }
  });

  await copyFile(resolve(here, 'node_modules/three/LICENSE'), resolve(root, `assets/js/${scene}.LICENSE.txt`));
  console.log(`Built assets/js/${scene}.js (${(await stat(output)).size} bytes).`);
}
