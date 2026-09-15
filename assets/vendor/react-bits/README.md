# React Bits effects in this website

Selected effects are adapted from [David Haz's React Bits](https://github.com/DavidHDev/react-bits), revision `3a1c7f2f9f94ed833934ab5c2635760b9e644583` (retrieved 2026-09-15).

This Jekyll website uses site-specific vanilla JavaScript / SCSS adaptations, not React components running in a React runtime. The adaptations are part of this website, not a separately distributed component library. The upstream [MIT + Commons Clause license](LICENSE.md) is included unchanged.

| Upstream component | Source at the reviewed revision | Adaptation |
| --- | --- | --- |
| SpotlightCard | [JSX and adjacent CSS](https://github.com/DavidHDev/react-bits/blob/3a1c7f2f9f94ed833934ab5c2635760b9e644583/src/content/Components/SpotlightCard/SpotlightCard.jsx) | Pointer-positioned radial light on research, project, profile, interests, and journey cards. |
| BlurText | [JSX](https://github.com/DavidHDev/react-bits/blob/3a1c7f2f9f94ed833934ab5c2635760b9e644583/src/content/TextAnimations/BlurText/BlurText.jsx) | One-shot, staggered blur/translate keyframes on static semantic heading spans. |
| ShinyText | [JSX and adjacent CSS](https://github.com/DavidHDev/react-bits/blob/3a1c7f2f9f94ed833934ab5c2635760b9e644583/src/content/TextAnimations/ShinyText/ShinyText.jsx) | Gradient text sweep, CSS rather than a continuous React frame loop. |
| StarBorder | [JSX and adjacent CSS](https://github.com/DavidHDev/react-bits/blob/3a1c7f2f9f94ed833934ab5c2635760b9e644583/src/content/Animations/StarBorder/StarBorder.jsx) | Two moving radial-gradient edge lights around the homepage CTA links. |
| GlareHover | [JSX and adjacent CSS](https://github.com/DavidHDev/react-bits/blob/3a1c7f2f9f94ed833934ab5c2635760b9e644583/src/content/Animations/GlareHover/GlareHover.jsx) | Diagonal reflective sweep on the portrait and project visuals. |

Implementation: `assets/js/bits.js`, `_sass/_bits-effects.scss`. Site surface styling is in `_sass/_bits-theme.scss`. Existing Three.js, card tilt, magnetic links, and interest galleries remain independent site features.

Differences from upstream: semantic HTML is server-rendered, no text is duplicated or injected as HTML, effects respect the existing Motion toggle, system reduced-motion setting, viewport visibility, hidden tabs, printing, and touch input. The blog uses the shared static surface styles but intentionally does not load the effects controller or WebGL runtime. No new JavaScript package or remote runtime CDN is required.
