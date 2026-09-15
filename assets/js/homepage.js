(function () {
  "use strict";

  var root = document.documentElement;
  var masthead = document.querySelector(".masthead");
  var navigation = document.querySelector("#site-nav");
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.querySelector("#nav-links");
  var mobile = window.matchMedia("(max-width: 960px)");
  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var pageActive = true;

  function closeMenu(restoreFocus) {
    if (!toggle || !menu) return;
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    if (restoreFocus) toggle.focus();
  }

  if (toggle && menu && navigation) {
    toggle.addEventListener("click", function () {
      var opening = toggle.getAttribute("aria-expanded") !== "true";
      menu.classList.toggle("is-open", opening);
      toggle.setAttribute("aria-expanded", String(opening));
    });

    navigation.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        closeMenu(true);
      }
    });

    document.addEventListener("click", function (event) {
      if (!navigation.contains(event.target)) closeMenu(false);
    });

    navigation.addEventListener("focusout", function () {
      window.requestAnimationFrame(function () {
        if (!navigation.contains(document.activeElement)) closeMenu(false);
      });
    });

    mobile.addEventListener("change", function () {
      var focusedInMenu = menu.contains(document.activeElement);
      var focusedOnToggle = document.activeElement === toggle;
      closeMenu(mobile.matches && focusedInMenu);
      if (!mobile.matches && focusedOnToggle) navigation.querySelector("a").focus();
      scheduleUpdate();
    });

    // Let native anchors retain URL history and reduced-motion behavior.
    navigation.addEventListener("click", function (event) {
      var link = event.target.closest("a[href^='#']");
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      closeMenu(false);
      var target = document.getElementById(link.hash.slice(1));
      if (target) {
        target.setAttribute("tabindex", "-1");
        window.requestAnimationFrame(function () {
          target.focus({ preventScroll: true });
        });
      }
    });
    root.classList.add("nav-enhanced");
  }

  // Keep content visible without JS; enhance section headings and intro only here.
  document.querySelectorAll(".section-heading:not([data-bits-blur]), .academic-intro > p:not(.intro-eyebrow), .intro-links").forEach(function (element) {
    element.setAttribute("data-reveal", "");
  });
  document.querySelectorAll(".highlight-blocks, .project-grid").forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (card, index) {
      card.style.setProperty("--reveal-delay", (index % 2) * 70 + "ms");
    });
  });
  var revealElements = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  var animatedCards = Array.prototype.slice.call(document.querySelectorAll(".floating-card"));
  var intersectingCards = [];
  var observer;
  function reveal(element) {
    element.classList.add("is-visible");
  }
  function revealAll() {
    revealElements.forEach(reveal);
    if (observer) observer.disconnect();
  }

  if (!motion.matches && root.dataset.motion !== "off" && "IntersectionObserver" in window) {
    root.classList.add("js-enhanced");
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });
    revealElements.forEach(function (element) { observer.observe(element); });
  } else {
    revealAll();
  }

  function syncCardActivity() {
    var hidden = !pageActive || document.hidden;
    var active = !hidden && !motion.matches && root.dataset.motion !== "off";
    root.dataset.pageHidden = hidden ? "true" : "false";
    animatedCards.forEach(function (card) {
      card.classList.toggle("is-inview", active && intersectingCards.indexOf(card) !== -1);
    });
  }

  // Reveals are one-shot, but looping diagram animations are only active while
  // their cards intersect the viewport. No extra animation frame loop is needed.
  if (animatedCards.length && "IntersectionObserver" in window) {
    var activityObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var index = intersectingCards.indexOf(entry.target);
        if (entry.isIntersecting && index === -1) intersectingCards.push(entry.target);
        else if (!entry.isIntersecting && index !== -1) intersectingCards.splice(index, 1);
      });
      syncCardActivity();
    }, { threshold: 0 });
    animatedCards.forEach(function (card) { activityObserver.observe(card); });
  }
  syncCardActivity();
  motion.addEventListener("change", function () {
    if (motion.matches) revealAll();
    syncCardActivity();
    scheduleUpdate();
  });
  document.addEventListener("homepage:motionchange", function (event) {
    if (!event.detail.enabled) revealAll();
    syncCardActivity();
    scheduleUpdate();
  });
  document.addEventListener("focusin", function (event) {
    var card = event.target.closest("[data-reveal]");
    if (card) reveal(card);
  });
  window.addEventListener("beforeprint", revealAll);

  var navItems = Array.prototype.slice.call(document.querySelectorAll("#site-nav a[href^='#']"))
    .map(function (link) {
      var target = document.getElementById(link.hash.slice(1));
      return target ? { link: link, target: target } : null;
    }).filter(Boolean);
  var chapters = Array.prototype.slice.call(document.querySelectorAll("[data-scene-chapter]"))
    .map(function (element) {
      return { element: element, index: parseInt(element.dataset.sceneChapter, 10) };
    }).filter(function (chapter) { return !isNaN(chapter.index); });
  var hero = chapters.filter(function (chapter) { return chapter.index === 0; })[0];
  var paperPanels = Array.prototype.slice.call(document.querySelectorAll(".paper-chapter"));

  function clamp(value) { return Math.max(0, Math.min(1, value)); }

  function updatePage() {
    pendingFrame = 0;
    if (!pageActive || document.hidden) return;
    if (masthead) masthead.classList.toggle("is-scrolled", window.scrollY > 12);
    var headerHeight = parseFloat(getComputedStyle(root).getPropertyValue("--header-height")) || 76;
    var sceneCovered = paperPanels.some(function (panel) {
      var bounds = panel.getBoundingClientRect();
      return bounds.top <= headerHeight && bounds.bottom >= window.innerHeight;
    });
    var scrollRange = root.scrollHeight - window.innerHeight;
    var progress = scrollRange > 0 ? clamp(window.scrollY / scrollRange) : 1;
    var chapterIndex = 0;
    var chapterLine = window.innerHeight * 0.45;
    chapters.forEach(function (chapter) {
      if (chapter.element.getBoundingClientRect().top <= chapterLine) chapterIndex = chapter.index;
    });
    if (chapters.length && scrollRange > 0 && window.scrollY >= scrollRange - 4) {
      chapterIndex = chapters[chapters.length - 1].index;
    }
    var heroProgress = 0;
    if (hero && !motion.matches && root.dataset.motion !== "off") {
      var heroBounds = hero.element.getBoundingClientRect();
      heroProgress = clamp(-heroBounds.top / Math.max(1, heroBounds.height));
    }
    root.style.setProperty("--reading-progress", progress);
    root.style.setProperty("--scroll-progress", progress);
    root.style.setProperty("--hero-progress", heroProgress);
    root.dataset.chapter = String(chapterIndex);
    // Scroll is native. This single event-driven frame synchronizes visual layers
    // without a scroll proxy, wheel interception, or a second animation loop.
    document.dispatchEvent(new CustomEvent("homepage:scroll", {
      detail: { progress: progress, chapter: chapterIndex, heroProgress: heroProgress, sceneCovered: sceneCovered }
    }));
    if (!navItems.length) return;
    var focusLine = headerHeight + 48;
    var active = navItems[0];
    navItems.forEach(function (item) {
      if (item.target.getBoundingClientRect().top <= focusLine) active = item;
    });
    if (window.scrollY + window.innerHeight >= root.scrollHeight - 4) active = navItems[navItems.length - 1];
    navItems.forEach(function (item) {
      var selected = item === active;
      item.link.classList.toggle("is-active", selected);
      if (selected) item.link.setAttribute("aria-current", "location");
      else item.link.removeAttribute("aria-current");
    });
  }
  var pendingFrame = 0;
  function scheduleUpdate() {
    if (pendingFrame || !pageActive || document.hidden) return;
    pendingFrame = window.requestAnimationFrame(updatePage);
  }
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("load", scheduleUpdate);
  window.addEventListener("pagehide", function () {
    pageActive = false;
    syncCardActivity();
    if (pendingFrame) window.cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
  });
  window.addEventListener("pageshow", function () { pageActive = true; syncCardActivity(); scheduleUpdate(); });
  document.addEventListener("visibilitychange", function () {
    syncCardActivity();
    if (document.hidden && pendingFrame) {
      window.cancelAnimationFrame(pendingFrame);
      pendingFrame = 0;
    } else if (!document.hidden) scheduleUpdate();
  });
  updatePage();
})();
