(function () {
  "use strict";

  var root = document.documentElement;
  var button = document.querySelector(".motion-toggle");
  var label = document.querySelector("[data-motion-label]");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var storageKey = "academic-visual-effects";
  var paused = false;
  var printing = false;
  var enabled = false;
  var sceneElement = document.querySelector("[data-compute-scene]");
  var sceneHost = sceneElement && sceneElement.querySelector(".scene-viewport");
  var scene = null;
  var sceneLoading = false;
  var sceneFailed = false;
  var sceneInView = false;
  var sceneObserver;
  var pageActive = true;
  var cards = Array.prototype.slice.call(document.querySelectorAll(".floating-card"));

  try { paused = window.localStorage.getItem(storageKey) === "off"; } catch (_) { /* Storage is optional. */ }

  function resetCards() {
    cards.forEach(function (card) {
      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
      card.style.removeProperty("--sheen-shift");
      card.classList.remove("is-tilting");
    });
  }

  function mayAnimateScene() {
    return enabled && sceneInView && pageActive && !document.hidden && !sceneFailed;
  }

  function syncScene() {
    if (!sceneHost) return;
    if (scene) {
      scene.setActive(mayAnimateScene());
      return;
    }
    // Respect data saving and avoid downloading WebGL code until it can be seen.
    if (!mayAnimateScene() || sceneLoading || (navigator.connection && navigator.connection.saveData)) return;
    sceneLoading = true;
    import(sceneElement.dataset.sceneUrl).then(function (module) {
      sceneLoading = false;
      if (!mayAnimateScene()) return;
      scene = module.createComputeScene(sceneHost, {
        onFailure: function () {
          sceneFailed = true;
          sceneHost.dataset.sceneState = "fallback";
        }
      });
      scene.setActive(mayAnimateScene());
    }).catch(function () {
      sceneLoading = false;
      sceneFailed = true;
      sceneHost.dataset.sceneState = "fallback";
    });
  }

  function updateMotion() {
    enabled = !paused && !reduced.matches && !printing;
    root.dataset.motion = enabled ? "on" : "off";
    if (button) {
      button.hidden = false;
      button.disabled = reduced.matches;
      button.setAttribute("aria-pressed", String(enabled));
      button.title = reduced.matches ? "Your system prefers reduced motion" : (enabled ? "Pause visual effects" : "Enable visual effects");
    }
    if (label) label.textContent = enabled ? "Motion on" : "Motion off";
    if (!enabled) resetCards();
    document.dispatchEvent(new CustomEvent("homepage:motionchange", { detail: { enabled: enabled } }));
    syncScene();
  }

  if (button) button.addEventListener("click", function () {
    paused = !paused;
    try { window.localStorage.setItem(storageKey, paused ? "off" : "on"); } catch (_) { /* Keep working without persistence. */ }
    updateMotion();
  });
  reduced.addEventListener("change", updateMotion);
  finePointer.addEventListener("change", resetCards);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) resetCards();
    syncScene();
  });
  window.addEventListener("beforeprint", function () { printing = true; updateMotion(); });
  window.addEventListener("afterprint", function () { printing = false; updateMotion(); });
  window.addEventListener("storage", function (event) {
    if (event.key === storageKey) { paused = event.newValue === "off"; updateMotion(); }
  });

  cards.forEach(function (card) {
    var sheen = document.createElement("span");
    sheen.className = "card-sheen";
    sheen.setAttribute("aria-hidden", "true");
    card.appendChild(sheen);
    var bounds;
    var frame = 0;
    var x = 0;
    var y = 0;
    function reset() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      bounds = null;
      card.classList.remove("is-tilting");
      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
      card.style.removeProperty("--sheen-shift");
    }
    card.addEventListener("pointerenter", function (event) {
      if (enabled && finePointer.matches && event.pointerType !== "touch") bounds = card.getBoundingClientRect();
    });
    card.addEventListener("pointermove", function (event) {
      if (!enabled || !finePointer.matches || event.pointerType === "touch") return;
      if (!bounds) bounds = card.getBoundingClientRect();
      x = Math.max(-0.5, Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5));
      y = Math.max(-0.5, Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5));
      if (frame) return;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        if (!enabled || !finePointer.matches || document.hidden) return;
        card.classList.add("is-tilting");
        card.style.setProperty("--tilt-x", (-y * 7).toFixed(2) + "deg");
        card.style.setProperty("--tilt-y", (x * 7).toFixed(2) + "deg");
        card.style.setProperty("--sheen-shift", (x * 80).toFixed(2) + "%");
      });
    });
    card.addEventListener("pointerleave", reset);
    card.addEventListener("pointercancel", reset);
    // Scrolling changes the card's viewport bounds; never use stale tilt coordinates.
    window.addEventListener("scroll", reset, { passive: true });
    window.addEventListener("resize", reset);
  });

  if (sceneElement && "IntersectionObserver" in window) {
    sceneObserver = new IntersectionObserver(function (entries) {
      sceneInView = entries[0].isIntersecting;
      syncScene();
    }, { threshold: 0 });
    sceneObserver.observe(sceneElement);
  }
  window.addEventListener("pagehide", function () {
    pageActive = false;
    resetCards();
    if (scene) scene.setActive(false);
  });
  window.addEventListener("pageshow", function () { pageActive = true; syncScene(); });
  updateMotion();
})();
