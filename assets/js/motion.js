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
  var sceneCovered = false;
  // The flight deck owns the GPU until its controller reports that it is hidden.
  var gatewayVisible = Boolean(document.querySelector("[data-space-gateway]"));
  var sceneObserver;
  var pageActive = true;
  var sceneProgress = 0;
  var sceneChapter = 0;
  var cards = Array.prototype.slice.call(document.querySelectorAll(".floating-card"));
  var magneticLinks = Array.prototype.slice.call(document.querySelectorAll("[data-magnetic]"));
  var pointerResets = [];

  try { paused = window.localStorage.getItem(storageKey) === "off"; } catch (_) { /* Storage is optional. */ }

  function resetPointers() {
    pointerResets.forEach(function (reset) { reset(); });
  }

  function syncScenePosition() {
    if (!scene || sceneFailed) return;
    // Optional methods keep the controller compatible with a static scene module.
    if (typeof scene.setProgress === "function") scene.setProgress(sceneProgress);
    if (typeof scene.setChapter === "function") scene.setChapter(sceneChapter);
  }

  function mayAnimateScene() {
    return enabled && sceneInView && !sceneCovered && !gatewayVisible && pageActive && !document.hidden && !sceneFailed;
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
      syncScenePosition();
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
    if (!enabled) resetPointers();
    document.dispatchEvent(new CustomEvent("homepage:motionchange", { detail: { enabled: enabled } }));
    syncScene();
  }

  if (button) button.addEventListener("click", function () {
    paused = !paused;
    try { window.localStorage.setItem(storageKey, paused ? "off" : "on"); } catch (_) { /* Keep working without persistence. */ }
    updateMotion();
  });
  reduced.addEventListener("change", updateMotion);
  finePointer.addEventListener("change", resetPointers);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) resetPointers();
    syncScene();
  });
  document.addEventListener("homepage:scroll", function (event) {
    var detail = event.detail || {};
    var coverageChanged = typeof detail.sceneCovered === "boolean" && detail.sceneCovered !== sceneCovered;
    if (coverageChanged) sceneCovered = detail.sceneCovered;
    if (typeof detail.progress === "number" && isFinite(detail.progress)) {
      sceneProgress = Math.max(0, Math.min(1, detail.progress));
    }
    if (typeof detail.chapter === "number" && isFinite(detail.chapter)) {
      sceneChapter = Math.max(0, Math.min(4, Math.round(detail.chapter)));
    }
    syncScenePosition();
    if (coverageChanged) syncScene();
  });
  document.addEventListener("homepage:gatewayvisibility", function (event) {
    var visible = event.detail && event.detail.visible;
    if (typeof visible !== "boolean" || visible === gatewayVisible) return;
    gatewayVisible = visible;
    syncScene();
  });
  window.addEventListener("beforeprint", function () { printing = true; updateMotion(); });
  window.addEventListener("afterprint", function () { printing = false; updateMotion(); });
  window.addEventListener("storage", function (event) {
    if (event.key === storageKey) { paused = event.newValue === "off"; updateMotion(); }
  });

  function trackPointer(element, properties, update) {
    var bounds;
    var frame = 0;
    var x = 0;
    var y = 0;
    function reset() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      bounds = null;
      element.classList.remove("is-tilting");
      properties.forEach(function (property) { element.style.removeProperty(property); });
    }
    function pointerAllowed(event) {
      return enabled && pageActive && !document.hidden && finePointer.matches && event.pointerType !== "touch";
    }
    pointerResets.push(reset);
    element.addEventListener("pointerenter", function (event) {
      if (pointerAllowed(event)) bounds = element.getBoundingClientRect();
      else reset();
    });
    element.addEventListener("pointermove", function (event) {
      if (!pointerAllowed(event)) { reset(); return; }
      if (!bounds) bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      x = Math.max(-0.5, Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5));
      y = Math.max(-0.5, Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5));
      if (frame) return;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        if (!enabled || !finePointer.matches || !pageActive || document.hidden) return;
        update(element, x, y);
      });
    });
    element.addEventListener("pointerleave", reset);
    element.addEventListener("pointercancel", reset);
    element.addEventListener("focusin", reset);
    element.addEventListener("keydown", reset);
  }

  cards.forEach(function (card) {
    var sheen = document.createElement("span");
    sheen.className = "card-sheen";
    sheen.setAttribute("aria-hidden", "true");
    card.appendChild(sheen);
    trackPointer(card, ["--tilt-x", "--tilt-y", "--sheen-shift"], function (element, x, y) {
      element.classList.add("is-tilting");
      element.style.setProperty("--tilt-x", (-y * 10).toFixed(2) + "deg");
      element.style.setProperty("--tilt-y", (x * 10).toFixed(2) + "deg");
      element.style.setProperty("--sheen-shift", (x * 80).toFixed(2) + "%");
    });
  });
  magneticLinks.forEach(function (link) {
    trackPointer(link, ["--magnetic-x", "--magnetic-y"], function (element, x, y) {
      element.style.setProperty("--magnetic-x", (x * 16).toFixed(2) + "px");
      element.style.setProperty("--magnetic-y", (y * 16).toFixed(2) + "px");
    });
  });
  // One shared listener cancels pending frames and invalidates viewport bounds.
  window.addEventListener("scroll", resetPointers, { passive: true });
  window.addEventListener("resize", resetPointers);

  if (sceneElement && "IntersectionObserver" in window) {
    sceneObserver = new IntersectionObserver(function (entries) {
      sceneInView = entries[0].isIntersecting;
      syncScene();
    }, { threshold: 0 });
    sceneObserver.observe(sceneElement);
  }
  window.addEventListener("pagehide", function () {
    pageActive = false;
    resetPointers();
    if (scene) scene.setActive(false);
  });
  window.addEventListener("pageshow", function () { pageActive = true; syncScene(); });
  updateMotion();
})();
