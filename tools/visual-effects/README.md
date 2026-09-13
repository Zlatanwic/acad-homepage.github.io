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

`createComputeScene(host, { onFailure } = {})` returns `setActive(boolean)` and
`dispose()`. Creation renders one frame without starting an animation loop. The
caller owns visibility and reduced-motion preferences. The host contains the static
SVG fallback; `data-scene-state="ready"` is set only after a successful render,
and failures restore `data-scene-state="fallback"`. The scene never removes the SVG.
`data-scene-animating` exposes the current loop state for browser smoke tests.

Rendering is capped at 30 fps with device pixel ratio capped at 1.5 (1 on small or
coarse-pointer screens). GPU resources and local pointer/context/resize listeners
are released on disposal or failure. Context loss permanently switches to the
static fallback for that scene instance.

The Node tests exercise the real Three.js scene graph with a renderer stub and
the actual `assets/js/motion.js` controller with DOM, animation-frame, and dynamic
import boundaries stubbed. They cover rendering lifecycle and cleanup, responsive
limits, reduced motion, saved preferences, data saving, tab/viewport/print pauses,
BFCache import races, import failure, and fine-pointer-only card tilt. Browser
checks are still required for the visual result and real WebGL support.
