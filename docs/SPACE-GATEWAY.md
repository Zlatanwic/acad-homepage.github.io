# Space gateway

The homepage opens with a progressively enhanced Three.js flight deck. It is a
standalone entry page, not a modal or a scroll lock. Each planet opens its own
futuristic dossier: `/profile/`, `/research/`, `/education/`, `/projects/`,
`/interests/`, or `/blog/`. The CV, academic information, images and Markdown blog
are preserved. Legacy homepage hash links are migrated by `legacy-routes.js`.

## Destinations

Edit `_includes/space-gateway.html` to change labels, native `href` links, planet
types, or positions. The six current destinations are Profile, Research,
Education, Projects, Beyond Research, and The Journal. CSS controls responsive
orb positions and sizes; the controller measures those same DOM elements to
align the 3D planets with their accessible links.

## Behaviour

- Third-person ship stays centered while dust moves toward the camera and four
  procedural exhaust plumes animate. No external model, texture, or CDN is used.
- Selecting a planet runs a roughly 1.9-second approach, then follows the native
  URL. Escape cancels; modified clicks retain their normal browser behaviour.
- Open archive bypasses the flight. Every dossier has a Star map return link.
- Dossiers use normal document flow, not scroll-driven chapter transitions.
  They load no homepage, Bits or WebGL runtime; only the journal loads `blog.js`.
- The existing Motion control and system reduced-motion setting apply. Save-data,
  unavailable WebGL, load failures, and missing observers retain static native
  navigation. There is no mandatory loading screen.
- Hidden tabs and offscreen scenes stop; reading pages do not load any WebGL
  renderer. The gateway targets 30 fps and
  caps pixel ratio to 1.5 on desktop / 1 on small screens.

## Development

Edit `assets/js/src/space-scene.js`, not its generated bundle. Controller:
`assets/js/space-gateway.js`; styles: `_sass/_space-gateway.scss`.

```sh
npm --prefix tools/visual-effects run build
npm --prefix tools/visual-effects test
ruby tools/visual-effects/blog-build.test.rb
```

Commit the rebuilt `assets/js/space-scene.js` and its Three.js MIT license alongside
source changes. GitHub Pages serves the checked-in bundle; no Node build is needed
on the deployment server. Tests cover scene projection, real Three.js scene graph
and resource cleanup with a mocked renderer, navigation/cancellation, fallback,
and isolation of the flight deck from independent dossier pages. Actual GPU rendering still
requires browser verification.
