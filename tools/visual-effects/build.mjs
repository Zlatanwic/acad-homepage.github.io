import { build } from 'esbuild';
import { copyFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const output = resolve(root, 'assets/js/compute-scene.js');

await build({
  entryPoints: [resolve(root, 'assets/js/src/compute-scene.js')],
  outfile: output,
  nodePaths: [resolve(here, 'node_modules')],
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  legalComments: 'inline',
  banner: { js: '/* Optional compute scene. Three.js MIT license: compute-scene.LICENSE.txt */' }
});

await copyFile(resolve(here, 'node_modules/three/LICENSE'), resolve(root, 'assets/js/compute-scene.LICENSE.txt'));
console.log(`Built assets/js/compute-scene.js (${(await stat(output)).size} bytes).`);
