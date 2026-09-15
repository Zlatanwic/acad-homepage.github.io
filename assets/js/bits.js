/*
 * Progressive Jekyll adapters for React Bits: SpotlightCard, BlurText,
 * ShinyText, StarBorder and GlareHover, by David Haz and contributors.
 * Adapted from revision 3a1c7f2f9f94ed833934ab5c2635760b9e644583.
 * Source: https://github.com/DavidHDev/react-bits
 * License: ../vendor/react-bits/LICENSE.md (MIT + Commons Clause).
 * No React runtime is needed; semantic content remains in the templates.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var pageActive = true;
  var printing = false;
  var active = false;
  var observer = null;
  var resets = [];
  var targets = [];

  function select(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  var blur = select("[data-bits-blur]");
  var shiny = select("[data-bits-shiny]");
  var stars = select("[data-bits-star]");
  var spotlights = select("[data-bits-spotlight]");
  var glares = select("[data-bits-glare]");

  blur.concat(shiny, stars, spotlights, glares).forEach(function (element) {
    if (!targets.some(function (state) { return state.element === element; })) {
      targets.push({ element: element, inView: false, revealed: false });
    }
  });
  if (!targets.length) return;

  function layer(element, name) {
    if (element.querySelector("." + name)) return;
    var span = document.createElement("span");
    span.className = name;
    span.setAttribute("aria-hidden", "true");
    element.appendChild(span);
  }
  spotlights.forEach(function (element) { layer(element, "bits-spotlight-layer"); });
  glares.forEach(function (element) { layer(element, "bits-glare-layer"); });
  stars.forEach(function (element) {
    layer(element, "bits-star-top");
    layer(element, "bits-star-bottom");
  });

  // Never split, duplicate, replace or hide accessible heading text in JS.
  blur.forEach(function (element) {
    Array.prototype.forEach.call(element.querySelectorAll(".bits-word"), function (word, index) {
      word.style.setProperty("--bits-delay", Math.min(index * 85, 425) + "ms");
    });
  });

  function allowed() {
    return root.dataset.motion === "on" && !reduced.matches && pageActive && !document.hidden && !printing;
  }
  function resetPointers() { resets.forEach(function (reset) { reset(); }); }
  function sync() {
    active = allowed();
    root.classList.toggle("bits-active", active);
    targets.forEach(function (state) {
      state.element.classList.toggle("bits-inview", active && state.inView);
      // Once motion is suspended, headings stay readable and do not replay.
      if (!active) state.element.classList.remove("bits-ready");
    });
    if (!active) resetPointers();
  }

  function track(element, spotlight) {
    var bounds = null;
    var frame = 0;
    var x = 0;
    var y = 0;
    function reset() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      bounds = null;
      element.classList.remove("bits-pointer-active");
      element.style.removeProperty("--bits-spotlight-x");
      element.style.removeProperty("--bits-spotlight-y");
    }
    function pointerAllowed(event) {
      return active && allowed() && finePointer.matches && event.pointerType !== "touch";
    }
    function move(event) {
      if (!pointerAllowed(event)) { reset(); return; }
      if (!bounds) bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) { reset(); return; }
      x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
      y = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
      if (frame) return;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        if (!active || !allowed() || !finePointer.matches) { reset(); return; }
        element.classList.add("bits-pointer-active");
        if (spotlight) {
          element.style.setProperty("--bits-spotlight-x", x.toFixed(1) + "px");
          element.style.setProperty("--bits-spotlight-y", y.toFixed(1) + "px");
        }
      });
    }
    resets.push(reset);
    element.addEventListener("pointerenter", move);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", reset);
    element.addEventListener("pointercancel", reset);
    element.addEventListener("focusin", reset);
    element.addEventListener("keydown", reset);
  }
  spotlights.forEach(function (element) { track(element, true); });
  glares.forEach(function (element) {
    if (spotlights.indexOf(element) === -1) track(element, false);
  });

  // One observer gates all ambient effects. Without it, the static page wins.
  if ("IntersectionObserver" in window) {
    try {
      observer = new window.IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var state = targets.find(function (item) { return item.element === entry.target; });
          if (!state) return;
          state.inView = entry.isIntersecting;
          state.element.classList.toggle("bits-inview", active && state.inView);
          if (state.inView && !state.revealed) {
            state.revealed = true;
            state.element.classList.add("bits-revealed");
          }
        });
      }, { threshold: 0, rootMargin: "0px" });
      targets.forEach(function (state) { observer.observe(state.element); });
    } catch (_) {
      if (observer) observer.disconnect();
      observer = null;
    }
  }

  sync();
  if (observer && active) blur.forEach(function (element) { element.classList.add("bits-ready"); });
  document.addEventListener("homepage:motionchange", sync);
  document.addEventListener("visibilitychange", sync);
  reduced.addEventListener("change", sync);
  finePointer.addEventListener("change", resetPointers);
  window.addEventListener("scroll", resetPointers, { passive: true });
  window.addEventListener("resize", resetPointers);
  window.addEventListener("pagehide", function () { pageActive = false; sync(); });
  window.addEventListener("pageshow", function () { pageActive = true; sync(); });
  window.addEventListener("beforeprint", function () { printing = true; sync(); });
  window.addEventListener("afterprint", function () { printing = false; sync(); });
})();
