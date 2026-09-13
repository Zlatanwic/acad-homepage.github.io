# Optional compute scene

The academic homepage loads the generated ES module only when the scene is visible
and motion is enabled. It needs no CDN, framework, build step on GitHub Pages, or
third-party request at runtime.

To rebuild the checked-in asset after changing `assets/js/src/compute-scene.js`:

```powershell
cd tools/visual-effects
npm ci
npm run build
npm test
```

Dependencies are pinned in `package.json` and `package-lock.json`. Commit the source,
generated `assets/js/compute-scene.js`, and `assets/js/compute-scene.LICENSE.txt`.
Do not commit `node_modules`.

`createComputeScene(host, { onFailure } = {})` returns `setActive(boolean)`,
`setProgress(number)`, `setChapter(number)`, and `dispose()`. Progress is clamped
to 0–1, chapter is rounded and clamped to 0–4, and non-finite inputs are ignored.
Both setters only change animation targets: they never start a loop or render.
The fixed full-viewport scene interpolates those targets inside its own loop.
Creation renders one frame without starting an animation loop. The
caller owns visibility and reduced-motion preferences. The host contains the static
SVG fallback; `data-scene-state="ready"` is set only after a successful render,
and failures restore `data-scene-state="fallback"`. The scene never removes the SVG.
`data-scene-animating` exposes the current loop state for browser smoke tests.

The asset-free composition contains five beveled, circuit-etched processor layers,
instanced contacts and silicon dies, satellite chips, three orbital data paths,
and a 260-particle field. Scroll opens the stack and changes its orientation;
chapters blend between cyan, ice-blue, and violet lighting. The desktop composition
is right-aligned, while viewports narrower than 720 px center it below the midpoint.

Rendering is capped at 30 fps with device pixel ratio capped at 1.5 (1 below 720 px
or on coarse-pointer screens). GPU resources and pointer/context/resize listeners
are released on disposal or failure. Context loss permanently switches to the
static fallback for that scene instance. Pointer parallax listens on `window`, so
the decorative canvas can keep `pointer-events: none` without blocking content.

The Node tests exercise the real Three.js scene graph with a renderer stub and
the actual `assets/js/motion.js` controller with DOM, animation-frame, and dynamic
import boundaries stubbed. They cover rendering lifecycle and cleanup, responsive
limits, clamped scroll choreography, composition/instancing, pointer cleanup,
reduced motion, saved preferences, data saving, tab/viewport/print pauses,
BFCache import races, import failure, and fine-pointer-only card tilt. Browser
checks are still required for the visual result and real WebGL support.
