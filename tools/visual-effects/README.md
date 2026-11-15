# Site scripts and tests

## The 3D architectural stage (`assets/js/src/scene.js`)

`assets/js/src/scene.js` implements a zero-dependency bare-metal WebGL + GLSL engine (~31 KB bundled) with flat-faceted paper-plane geometry, tension-cable wireframes, and a 5-band cyanotype / midnight-void ramp:

- **Manchester City's Etihad Stadium**: 12 perimeter cable-stayed masts, fanning forestay/backstay cables, saddle-wave curved elliptical canopy, 4 spiral concourse rotundas, and sky-blue sunken bowl.
- **Blue Moon Spire & Turntable Pendulum**: 26-step staircase with crimson tie-knots, fluted spire, crowning Blue Moon sphere + tilted orbital ring, rotating Britpop vinyl space-frame truss, and a 1% crimson (`#e0304e`) swaying pendulum.
- **Tsinghua Gatehouse & KV-Cache Village**: triple-arch paper gatehouse, stacked isometric KV-cache pavilions, and catenary RDMA interconnects.
- **Phase-Locked Axial GPU Foundry**: monumental chamfered GPU shroud, 9-blade swept axial intake fan with bullet-time phase-lock (`fanAngleAt`) guaranteeing collision-free camera passage between two blades into the 20-pair heatsink fin canyon, 8 HBM3e towers, and glowing quad-quadrant SM/Tensor Silicon Die.

GitHub Pages never runs Node, so the bundle is checked in. After editing the source:

```powershell
cd tools/visual-effects
npm ci
npm run build   # writes assets/js/scene.js (~31 KB, zero runtime dependencies)
npm test
```

`assets/js/site.js` drives scroll progress (`0..1`), steady-frame reveal (`html.glon`), `--gbg` ground color synchronization, Light/Dark theme switching (`data-theme`), and EN/ZH bilingual desk switching (`data-lang`).

## Tests

- `scene.test.mjs`: WebGL lifecycle, steady gate, sub-native buffer scaling, collision-free 9-blade fan passage proof, 4-act scroll spline, fallback & bundle freshness.
- `site.test.mjs`: lazy loading, steady gate, scroll-progress syncing, theme/lang toggles, mobile center-window shadow, card tilt.
- `blog.test.mjs`, `legacy-routes.test.mjs`: blog filtering/TOC and old-bookmark redirects.
- `blog-build.test.rb`: builds the whole site with Jekyll in a temp directory and verifies every page, navigation link, SEO tag, and Atom XML feed.
