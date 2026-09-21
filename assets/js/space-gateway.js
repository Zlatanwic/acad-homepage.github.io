(function () {
  "use strict";

  var gateway = document.querySelector("[data-space-gateway]");
  if (!gateway) return;
  var host = gateway.querySelector("[data-space-canvas]");
  var links = Array.prototype.slice.call(gateway.querySelectorAll("[data-space-destination]"));
  if (!host || !links.length) return;

  var root = document.documentElement;
  var status = gateway.querySelector("[data-space-status]");
  var loading = gateway.querySelector("[data-space-loading]");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var connection = navigator.connection;
  var scene = null;
  var sceneModule = null;
  var importing = false;
  var constructing = false;
  var failed = false;
  var ready = false;
  var visible = false;
  var pageActive = true;
  var printing = false;
  var enabled = root.dataset.motion === "on";
  var loadTimer = 0;
  var flightTimer = 0;
  var resizeTimer = 0;
  var flight = null;

  document.body.classList.add("has-space-gateway");

  function announceVisibility(value) {
    document.dispatchEvent(new CustomEvent("homepage:gatewayvisibility", { detail: { visible: value } }));
  }
  var initialBounds = gateway.getBoundingClientRect();
  announceVisibility(initialBounds.bottom > 0 && initialBounds.top < window.innerHeight);

  function setStatus(text) { if (status) status.textContent = text; }
  function setLoading(text) { if (loading) loading.textContent = text; }
  function motionAllowed() {
    return enabled && !reduced.matches && !printing && !(connection && connection.saveData);
  }
  function isActive() { return visible && pageActive && !document.hidden && motionAllowed() && !failed; }
  function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
  function number(value, fallback) { var result = Number(value); return isFinite(result) ? result : fallback; }

  function destinations() {
    var bounds = host.getBoundingClientRect();
    return links.map(function (link) {
      var orb = link.querySelector(".space-planet-orb");
      var box = orb && orb.getBoundingClientRect();
      var mobile = bounds.width <= 700;
      var x = number(mobile ? link.dataset.mobileX : link.dataset.x, 0.5);
      var y = number(mobile ? link.dataset.mobileY : link.dataset.y, 0.4);
      var radius = number(link.dataset.radius, mobile ? 28 : 44);
      if (box && bounds.width > 0 && bounds.height > 0 && box.width > 0) {
        x = (box.left + box.width / 2 - bounds.left) / bounds.width;
        y = (box.top + box.height / 2 - bounds.top) / bounds.height;
        radius = box.width / 2;
      }
      return {
        id: link.dataset.destination,
        label: link.dataset.label || link.textContent.trim(),
        x: clamp(x, 0, 1),
        y: clamp(y, 0, 1),
        radius: clamp(radius, 8, Math.max(8, Math.min(bounds.width || 200, bounds.height || 200) / 4)),
        kind: link.dataset.kind || "rocky",
        color: link.dataset.color || "#78bfff"
      };
    });
  }

  function clearLoadTimer() { window.clearTimeout(loadTimer); loadTimer = 0; }
  function endFlight(message) {
    window.clearTimeout(flightTimer);
    flightTimer = 0;
    flight = null;
    gateway.classList.remove("is-travelling");
    gateway.removeAttribute("aria-busy");
    if (message) setStatus(message);
  }
  function cancelFlight(restoreFocus) {
    var previous = flight;
    endFlight(previous ? "Flight cancelled. Choose a destination." : null);
    if (scene) scene.cancelTravel();
    if (restoreFocus && previous) previous.link.focus({ preventScroll: true });
  }

  function targetUrl(link) {
    try {
      var url = new URL(link.getAttribute("href"), window.location.href);
      if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) return null;
      return url;
    } catch (_) { return null; }
  }
  function navigate(target) {
    var url = targetUrl(target.link);
    if (!url) return;
    endFlight("Arrived at " + target.label + ".");
    window.location.assign(url.href);
    // Preserve normal anchor history/scrolling and move keyboard focus into the chapter.
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) {
      var id;
      try { id = decodeURIComponent(url.hash.slice(1)); } catch (_) { return; }
      var destination = document.getElementById(id);
      if (destination) {
        if (!destination.hasAttribute("tabindex")) {
          destination.setAttribute("tabindex", "-1");
          destination.addEventListener("blur", function () { destination.removeAttribute("tabindex"); }, { once: true });
        }
        destination.focus({ preventScroll: true });
      }
    }
  }
  function fallback() {
    if (failed) return;
    var pending = flight;
    failed = true;
    importing = false;
    constructing = false;
    ready = false;
    clearLoadTimer();
    cancelFlight(false);
    gateway.classList.remove("space-flight-ready");
    host.dataset.sceneState = "fallback";
    setLoading("Static flight deck — all destinations remain available");
    setStatus("Choose a destination to explore.");
    if (scene) { scene.dispose(); scene = null; }
    // A renderer failure must not consume a destination the visitor already chose.
    if (pending) navigate(pending);
  }
  function startLoadTimer() {
    clearLoadTimer();
    loadTimer = window.setTimeout(fallback, 8000);
  }
  function onReady() {
    if (failed) return;
    ready = true;
    constructing = false;
    clearLoadTimer();
    gateway.classList.add("space-flight-ready");
    host.dataset.sceneState = "ready";
    setLoading("Flight systems online");
    setStatus("Choose a destination");
    if (scene) scene.setActive(isActive());
  }

  function syncScene() {
    if (!isActive()) cancelFlight(false);
    if (scene) { scene.setActive(isActive()); return; }
    if (!isActive() || importing || constructing || failed) return;
    if (!sceneModule) {
      importing = true;
      setLoading("Preparing flight systems…");
      startLoadTimer();
      import(gateway.dataset.sceneUrl).then(function (module) {
        importing = false;
        if (failed) return;
        sceneModule = module;
        clearLoadTimer();
        syncScene();
      }).catch(fallback);
      return;
    }
    try {
      constructing = true;
      startLoadTimer();
      var created = sceneModule.createSpaceScene(host, {
        destinations: destinations(),
        onReady: onReady,
        onFailure: fallback
      });
      if (failed) { if (created) created.dispose(); return; }
      scene = created;
      scene.setActive(isActive());
    } catch (_) { fallback(); }
  }

  links.forEach(function (link) {
    function hover() { if (scene && isActive()) scene.setHovered(link.dataset.destination); }
    function unhover(event) {
      if (event && event.relatedTarget && link.contains(event.relatedTarget)) return;
      if (scene) scene.setHovered(null);
    }
    link.addEventListener("pointerenter", hover);
    link.addEventListener("focusin", hover);
    link.addEventListener("pointerleave", unhover);
    link.addEventListener("focusout", unhover);
    link.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
          link.hasAttribute("download") || (link.getAttribute("target") && link.getAttribute("target") !== "_self")) return;
      if (!targetUrl(link)) return;
      if (flight) { event.preventDefault(); return; }
      if (!scene || !ready || !isActive()) return;
      event.preventDefault();
      var current = {
        link: link,
        label: link.dataset.label || link.textContent.trim()
      };
      flight = current;
      gateway.classList.add("is-travelling");
      gateway.setAttribute("aria-busy", "true");
      setStatus("Flying to " + current.label + "… Press Escape to cancel.");
      flightTimer = window.setTimeout(function () {
        if (flight !== current) return;
        scene.cancelTravel();
        navigate(current);
      }, 8000);
      try {
        Promise.resolve(scene.travelTo(link.dataset.destination)).then(function (completed) {
          if (flight !== current) return;
          if (completed && isActive()) navigate(current);
          else cancelFlight(false);
        }).catch(function () { if (flight === current) fallback(); });
      } catch (_) { fallback(); }
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && flight) { event.preventDefault(); cancelFlight(true); }
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-space-skip], [data-space-return]"), function (link) {
    link.addEventListener("click", function () { cancelFlight(false); });
  });
  document.addEventListener("homepage:motionchange", function (event) {
    enabled = Boolean(event.detail && event.detail.enabled);
    syncScene();
  });
  reduced.addEventListener("change", syncScene);
  if (connection && typeof connection.addEventListener === "function") connection.addEventListener("change", syncScene);
  document.addEventListener("visibilitychange", syncScene);
  window.addEventListener("pagehide", function () { pageActive = false; syncScene(); });
  window.addEventListener("pageshow", function () { pageActive = true; syncScene(); });
  window.addEventListener("beforeprint", function () { printing = true; syncScene(); });
  window.addEventListener("afterprint", function () { printing = false; syncScene(); });
  window.addEventListener("hashchange", function () {
    if (window.location.hash && window.location.hash !== "#space-gateway") cancelFlight(false);
  });
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      resizeTimer = 0;
      if (scene && !failed) scene.setDestinations(destinations());
    }, 100);
  });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      var entry = entries[0];
      visible = entry.isIntersecting && entry.intersectionRatio > 0.5;
      document.body.classList.toggle("space-at-gateway", visible);
      // Pause the old chapter scene before starting this renderer, and stop this
      // renderer before allowing the old scene to resume. Never run both loops.
      if (entry.isIntersecting && entry.intersectionRatio > 0) {
        announceVisibility(true);
        syncScene();
      } else {
        syncScene();
        announceVisibility(false);
      }
    }, { threshold: [0, 0.5, 1] });
    observer.observe(gateway);
  } else {
    setLoading("Static flight deck — choose a destination");
  }
})();
