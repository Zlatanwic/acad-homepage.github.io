import { build } from 'esbuild';
import { stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Bundles assets/js/src/scene.js into the checked-in zero-dependency browser
// module assets/js/scene.js. GitHub Pages never runs Node.
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const output = resolve(root, 'assets/js/scene.js');

await build({
  entryPoints: [resolve(root, 'assets/js/src/scene.js')],
  outfile: output,
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  legalComments: 'none',
  banner: { js: '/* Paper-plane architecture, Etihad Stadium & axial GPU foundry WebGL scene. */' }
});

console.log(`Built assets/js/scene.js (${(await stat(output)).size} bytes).`);
