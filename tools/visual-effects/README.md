# Site scripts and tests

## The 3D architectural stage (`assets/js/src/scene.js`)

`assets/js/src/scene.js` implements a zero-dependency bare-metal WebGL + GLSL engine (~37 KB bundled) with flat-faceted paper-plane geometry, tension-cable wireframes, and a 5-band cyanotype / midnight-void ramp:

- **Etihad Stadium & 93:20 Pitch**: 12 perimeter cable-stayed masts, fanning forestay/backstay cables, saddle-wave curved elliptical canopy, 4 spiral concourse rotundas, a sky-blue sunken bowl, and the 93:20 scoreboard.
- **33 RPM-Styled Bullet-Time Turntable & Tsinghua-Roofline Corridor**: a deliberately slowed vinyl platter with counterweighted tonearm and crimson stylus, followed by a triple-arch paper gatehouse, stacked KV-cache pavilions, and catenary RDMA interconnects.
- **Phase-Locked 3D Tensor Core**: monumental chamfered GPU shroud, 9-blade swept axial intake fan with bullet-time phase-lock (`fanAngleAt`) guaranteeing collision-free camera passage between two blades into the 20-pair heatsink fin canyon, 8 HBM3e towers, floating deconstructed 3×3×3 MMA cube, and glowing quad-quadrant SM/Tensor Silicon Die.

GitHub Pages never runs Node, so the bundle is checked in. After editing the source:

```powershell
cd tools/visual-effects
npm ci
npm run build   # writes assets/js/scene.js (~37 KB, zero runtime dependencies)
npm test
```

`assets/js/site.js` drives scroll progress (`0..1`), steady-frame reveal (`html.glon`), `--gbg` ground color synchronization, Light/Dark theme switching (`data-theme`), and EN/ZH bilingual desk switching (`data-lang`). It skips the WebGL module for `prefers-reduced-motion` and data-saver connections.

## Tests

- `scene.test.mjs`: WebGL lifecycle, steady gate, sub-native buffer scaling, collision-free 9-blade fan passage proof, 4-act scroll spline, fallback & bundle freshness.
- `site.test.mjs`: lazy loading, steady gate, scroll-progress syncing, theme/lang toggles, mobile center-window shadow, card tilt, and reduced-motion static fallback.
- `blog.test.mjs`, `legacy-routes.test.mjs`: blog filtering/TOC and old-bookmark redirects.
- `blog-build.test.rb`: builds the whole site in a temp directory with Jekyll 4, verifies the configured plugins' outputs, every page, navigation link, SEO tag, and Atom XML feed. CI runs these tests plus the JS suite, then separately enforces the frozen production build and validates its plugin outputs.
