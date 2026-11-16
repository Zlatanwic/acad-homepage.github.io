(function () {
  'use strict';

  // Progressive enhancement only: every page is complete without this file.
  var doc = document;
  var win = window;
  var root = doc.documentElement || null;

  function media(query) {
    return (typeof win.matchMedia === 'function' && win.matchMedia(query)) || { matches: false };
  }

  function listen(query, handler) {
    if (!query) return;
    if (typeof query.addEventListener === 'function') query.addEventListener('change', handler);
    else if (typeof query.addListener === 'function') query.addListener(handler);
  }

  function readStorage(key) {
    try {
      return win.localStorage ? win.localStorage.getItem(key) : null;
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      if (win.localStorage) win.localStorage.setItem(key, value);
    } catch (error) {
      /* Ignore storage quota or privacy-mode errors. */
    }
  }

  var reducedMotion = media('(prefers-reduced-motion: reduce)');
  var finePointer = media('(hover: hover) and (pointer: fine)');
  var darkScheme = media('(prefers-color-scheme: dark)');
  var activeSceneController = null;

  function currentTheme() {
    var attr = root && root.getAttribute ? root.getAttribute('data-theme') : null;
    if (attr === 'dark' || attr === 'light') return attr;
    var saved = readStorage('kl-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return darkScheme.matches ? 'dark' : 'light';
  }

  function syncGroundVar(hex) {
    if (!root || !root.style || !hex) return;
    root.style.setProperty('--gbg', hex);
    var meta = doc.querySelector ? doc.querySelector('meta[name="theme-color"]') : null;
    if (meta && typeof meta.setAttribute === 'function') meta.setAttribute('content', hex);
  }

  function applyTheme(theme, persist) {
    var normalized = theme === 'dark' ? 'dark' : 'light';
    if (root && typeof root.setAttribute === 'function') {
      root.setAttribute('data-theme', normalized);
    }
    if (persist) writeStorage('kl-theme', normalized);
    if (activeSceneController && typeof activeSceneController.setTheme === 'function') {
      activeSceneController.setTheme(normalized);
      if (typeof activeSceneController.getGroundColor === 'function') {
        syncGroundVar(activeSceneController.getGroundColor());
      }
    } else {
      syncGroundVar(normalized === 'dark' ? '#030711' : '#ffffff');
    }
    var buttons = doc.querySelectorAll ? doc.querySelectorAll('[data-theme-toggle]') : [];
    Array.prototype.forEach.call(buttons, function (btn) {
      if (typeof btn.setAttribute === 'function') {
        btn.setAttribute('aria-pressed', normalized === 'dark' ? 'true' : 'false');
      }
    });
  }

  function initTheme() {
    applyTheme(currentTheme(), false);
    var buttons = doc.querySelectorAll ? doc.querySelectorAll('[data-theme-toggle]') : [];
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
      });
    });
    listen(darkScheme, function () {
      if (!readStorage('kl-theme')) applyTheme(darkScheme.matches ? 'dark' : 'light', false);
    });
  }

  function currentLang() {
    var attr = root && root.getAttribute ? root.getAttribute('data-lang') : null;
    if (attr === 'zh' || attr === 'en') return attr;
    var saved = readStorage('kl-lang');
    return saved === 'zh' ? 'zh' : 'en';
  }

  function applyLang(lang, persist) {
    var normalized = lang === 'zh' ? 'zh' : 'en';
    if (root && typeof root.setAttribute === 'function') {
      root.setAttribute('data-lang', normalized);
    }
    if (persist) writeStorage('kl-lang', normalized);
    var buttons = doc.querySelectorAll ? doc.querySelectorAll('[data-lang-toggle]') : [];
    Array.prototype.forEach.call(buttons, function (btn) {
      if (typeof btn.setAttribute === 'function') {
        btn.setAttribute('aria-pressed', normalized === 'zh' ? 'true' : 'false');
      }
    });
  }

  function initLang() {
    applyLang(currentLang(), false);
    var buttons = doc.querySelectorAll ? doc.querySelectorAll('[data-lang-toggle]') : [];
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        applyLang(currentLang() === 'zh' ? 'en' : 'zh', true);
      });
    });
  }

  // Tactile tilt for subpage cards. Fine pointers only, never with reduced motion.
  function initTilt() {
    var tilts = [];
    var cards = doc.querySelectorAll ? doc.querySelectorAll('[data-tilt]') : [];
    Array.prototype.forEach.call(cards, function (card) {
      var frame = 0;
      var pending = null;

      function reset() {
        pending = null;
        if (frame) win.cancelAnimationFrame(frame);
        frame = 0;
        card.classList.remove('is-tilting');
        card.style.removeProperty('--rx');
        card.style.removeProperty('--ry');
      }

      function apply() {
        frame = 0;
        if (!pending || reducedMotion.matches || !finePointer.matches) return;
        var rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var x = Math.min(1, Math.max(0, (pending.clientX - rect.left) / rect.width));
        var y = Math.min(1, Math.max(0, (pending.clientY - rect.top) / rect.height));
        card.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      }

      card.addEventListener('pointermove', function (event) {
        if (event.pointerType === 'touch' || reducedMotion.matches || !finePointer.matches) return;
        pending = event;
        card.classList.add('is-tilting');
        if (!frame) frame = win.requestAnimationFrame(apply);
      });
      card.addEventListener('pointerleave', reset);
      tilts.push(reset);
    });
    listen(reducedMotion, function () {
      if (reducedMotion.matches) tilts.forEach(function (reset) { reset(); });
    });
  }

  function getScrollProgress() {
    var scrollHeight = root && root.scrollHeight ? root.scrollHeight : 0;
    var viewportHeight = win.innerHeight || 0;
    var maxScroll = Math.max(0, scrollHeight - viewportHeight);
    if (!maxScroll) return 0;
    var y = win.scrollY || win.pageYOffset || 0;
    return Math.min(1, Math.max(0, y / maxScroll));
  }

  // Full-viewport 3D stage + scroll camera choreography on the homepage.
  // Never downloads WebGL on data-saver connections or with reduced motion;
  // keeps the SVG blueprint fallback on failure.
  function initScene() {
    var host = doc.querySelector ? doc.querySelector('[data-scene]') : null;
    if (!host) return;

    var windows = doc.querySelectorAll ? Array.prototype.slice.call(doc.querySelectorAll('.win')) : [];
    var scrollFrame = 0;

    function syncScrollState() {
      scrollFrame = 0;
      var p = getScrollProgress();
      if (root && root.classList) {
        if (p > 0.03) root.classList.add('is-scrolled');
        else root.classList.remove('is-scrolled');
        if (p > 0.74) root.classList.add('in-core');
        else root.classList.remove('in-core');
        if (p > 0.91) root.classList.add('at-climax');
        else root.classList.remove('at-climax');
      }
      if (activeSceneController && typeof activeSceneController.setScroll === 'function') {
        activeSceneController.setScroll(p);
        if (typeof activeSceneController.getGroundColor === 'function') {
          syncGroundVar(activeSceneController.getGroundColor());
        }
      }
      if (windows.length && (win.innerWidth || 1024) < 720) {
        var mid = (win.innerHeight || 800) * 0.5;
        var best = null;
        var bestDist = Infinity;
        for (var i = 0; i < windows.length; i += 1) {
          var rect = windows[i].getBoundingClientRect();
          var center = rect.top + rect.height * 0.5;
          var dist = Math.abs(center - mid);
          if (rect.bottom > 0 && rect.top < (win.innerHeight || 800) && dist < bestDist) {
            bestDist = dist;
            best = windows[i];
          }
        }
        for (var j = 0; j < windows.length; j += 1) {
          if (windows[j] === best) windows[j].classList.add('is-center');
          else windows[j].classList.remove('is-center');
        }
      }
    }

    function queueScrollSync() {
      if (!scrollFrame && typeof win.requestAnimationFrame === 'function') {
        scrollFrame = win.requestAnimationFrame(syncScrollState);
      }
    }

    syncScrollState();
    win.addEventListener('scroll', queueScrollSync, { passive: true });
    win.addEventListener('resize', queueScrollSync, { passive: true });

    var source = host.getAttribute('data-scene-src');
    var connection = win.navigator && win.navigator.connection;
    if (!source || (connection && connection.saveData)) return;

    var controller = null;
    var loading = false;
    var loadGeneration = 0;
    var sceneFailed = false;
    var visible = false;
    var stopped = false;
    var sceneSteady = false;
    var userPaused = false;
    var motionBtn = doc.querySelector ? doc.querySelector('[data-scene-motion]') : null;
    var hud = motionBtn && typeof motionBtn.closest === 'function'
      ? motionBtn.closest('.hero-stage__hud')
      : null;

    function syncMotionBtn() {
      if (!motionBtn) return;
      var show = Boolean(sceneSteady && controller && !reducedMotion.matches && !stopped);
      motionBtn.hidden = !show;
      if (show) {
        if (typeof motionBtn.removeAttribute === 'function') motionBtn.removeAttribute('hidden');
      } else if (typeof motionBtn.setAttribute === 'function') {
        motionBtn.setAttribute('hidden', '');
      }
      if (hud && hud.classList) {
        if (show) hud.classList.add('has-motion-control');
        else hud.classList.remove('has-motion-control');
      }
      motionBtn.textContent = userPaused ? 'Play 3D' : 'Pause 3D';
    }

    if (motionBtn && typeof motionBtn.addEventListener === 'function') {
      motionBtn.addEventListener('click', function () {
        userPaused = !userPaused;
        update();
      });
    }

    function update() {
      if (controller) controller.setActive(visible && !doc.hidden && !reducedMotion.matches && !userPaused);
      syncMotionBtn();
    }

    function staticGroundColor() {
      return currentTheme() === 'dark' ? '#030711' : '#ffffff';
    }

    function disableForReducedMotion() {
      loadGeneration += 1; // invalidate any in-flight dynamic import
      loading = false;
      if (controller) {
        controller.dispose();
        controller = null;
        activeSceneController = null;
      }
      sceneSteady = false;
      if (root && root.classList) root.classList.remove('glon');
      syncGroundVar(staticGroundColor());
      syncMotionBtn();
    }

    function handleMotionPreferenceChange() {
      if (reducedMotion.matches) {
        disableForReducedMotion();
      } else {
        if (visible) load();
        update();
      }
    }

    function load() {
      if (loading || stopped || reducedMotion.matches) return;
      loading = true;
      sceneFailed = false;
      var generation = ++loadGeneration;
      var url;
      try { url = new win.URL(source, win.location.href).href; } catch (error) { loading = false; return; }
      var request;
      try { request = import(url); } catch (error) { loading = false; return; }
      request.then(function (module) {
        if (stopped || generation !== loadGeneration || reducedMotion.matches || !module || typeof module.createScene !== 'function') {
          if (generation === loadGeneration) loading = false;
          return;
        }
        controller = module.createScene(host, {
          theme: currentTheme(),
          scroll: getScrollProgress(),
          onSteady: function (groundHex) {
            sceneSteady = true;
            if (root && root.classList) root.classList.add('glon');
            syncGroundVar(groundHex);
            syncMotionBtn();
          },
          onGroundChange: syncGroundVar,
          onFailure: function () {
            sceneFailed = true;
            loading = false;
            sceneSteady = false;
            if (root && root.classList) root.classList.remove('glon');
            controller = null;
            activeSceneController = null;
            syncMotionBtn();
          }
        });
        if (sceneFailed) return;
        activeSceneController = controller;
        update();
      }).catch(function () {
        if (generation === loadGeneration) loading = false;
      });
    }

    if (typeof win.IntersectionObserver === 'function') {
      var observer = new win.IntersectionObserver(function (entries) {
        visible = entries.some(function (entry) { return entry.isIntersecting; });
        if (visible) load();
        update();
      }, { rootMargin: '120px 0px' });
      observer.observe(host);
    } else {
      visible = true;
      load();
    }

    doc.addEventListener('visibilitychange', update);
    listen(reducedMotion, handleMotionPreferenceChange);
    win.addEventListener('pagehide', function (event) {
      if (event && event.persisted) { if (controller) controller.setActive(false); return; }
      stopped = true;
      sceneSteady = false;
      if (root && root.classList) root.classList.remove('glon');
      if (controller) controller.dispose();
      controller = null;
      activeSceneController = null;
      syncMotionBtn();
    });
    win.addEventListener('pageshow', function (event) { if (event && event.persisted) update(); });
  }

  function initialize() {
    initTheme();
    initLang();
    initTilt();
    initScene();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
