# Kuo Li — personal site

Source for <https://zlatanwic.github.io/acad-homepage.github.io/>: a Jekyll site with a
zero-dependency WebGL 3D architectural homepage, five independent directory pages
(about, research, path, projects, off the clock), and a Markdown blog with an Atom feed.

## Design

99% cyanotype sky-blue paper ramp + 1% crimson (`#e0304e`) focal accent, with instant
Light ("Sky-Blue Cyanotype Paper") / Dark ("Midnight Compute Void") and EN/ZH desk toggles.
The homepage is a continuous 4-act scroll flythrough — from Manchester City's cable-stayed
Etihad Stadium and the fluted Blue Moon Spire, past staggered Aqua workstation windows,
through the phase-locked swept blades of a monumental axial GPU intake fan, and into a
heatsink fin canyon facing a glowing quad-quadrant SM/Tensor Silicon Die. Every page works
without JavaScript (with an inline cyanotype SVG blueprint fallback), and motion respects
`prefers-reduced-motion`.

| Path | Purpose |
| --- | --- |
| `_layouts/default.html` | Shared layout (`#grade` overlay + header + footer); `post.html` wraps it for articles |
| `_includes/site-header.html`, `page-hero.html`, `site-footer.html` | `/Kuo Li` pixel header + `.glass` controls, Aqua directory headers, footer |
| `_data/navigation.yml` | Navigation items (`id` matches each page's `nav_id`) |
| `_sass/` + `assets/css/main.scss` | Tokens, pixel + serif typography, Aqua windows, directory & reading styles |
| `assets/js/site.js` | Scroll-camera driver, `html.glon` steady gate, theme/lang toggles, card tilt |
| `assets/js/src/scene.js` → `assets/js/scene.js` | Zero-dependency WebGL 3D engine (~31 KB bundled via `tools/visual-effects/build.mjs`) |
| `assets/js/blog.js` | Blog search, tag filter, and article table of contents |
| `assets/js/legacy-routes.js` | Redirects old homepage `#anchors` to their independent pages |

## Writing and publishing

See [docs/BLOGGING.md](docs/BLOGGING.md) (in Chinese) for front matter, images,
drafts, local preview, and the feed. Pushing to `main` runs
`.github/workflows/pages.yml`, which builds with `actions/jekyll-build-pages` and
deploys to GitHub Pages.

## Local preview and tests

```bash
bash run_server.sh                               # bundle exec jekyll serve --livereload
cd tools/visual-effects && npm ci && npm test   # WebGL scene, controller, blog, routes
ruby tools/visual-effects/blog-build.test.rb    # full Jekyll build & Atom XML checks
```

## Acknowledgements

- Originally forked from [RayeRen/acad-homepage.github.io](https://github.com/RayeRen/acad-homepage.github.io) (MIT, see `LICENSE`).
- Self-hosted open-source fonts: Fusion Pixel 12px Proportional SC (`assets/fonts/fusion-pixel.LICENSE.txt`, SIL OFL 1.1) and Source Serif 4 (`assets/fonts/source-serif-4.LICENSE.txt`, SIL OFL 1.1).
