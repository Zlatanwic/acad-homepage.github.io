(function () {
  "use strict";

  var root = document.documentElement;
  var masthead = document.querySelector(".masthead");
  var navigation = document.querySelector("#site-nav");
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.querySelector("#nav-links");
  var mobile = window.matchMedia("(max-width: 960px)");
  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
  document.querySelectorAll(".section-heading, .academic-intro > p:not(.intro-eyebrow), .intro-links").forEach(function (element) {
    element.setAttribute("data-reveal", "");
  });
  document.querySelectorAll(".highlight-blocks, .project-grid").forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (card, index) {
      card.style.setProperty("--reveal-delay", (index % 2) * 70 + "ms");
    });
  });
  var revealElements = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  var observer;
  function revealAll() {
    revealElements.forEach(function (element) { element.classList.add("is-visible"); });
    if (observer) observer.disconnect();
  }

  if (!motion.matches && root.dataset.motion !== "off" && "IntersectionObserver" in window) {
    root.classList.add("js-enhanced");
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });
    revealElements.forEach(function (element) { observer.observe(element); });
  } else {
    revealAll();
  }
  motion.addEventListener("change", function () { if (motion.matches) revealAll(); });
  document.addEventListener("homepage:motionchange", function (event) { if (!event.detail.enabled) revealAll(); });
  document.addEventListener("focusin", function (event) {
    var card = event.target.closest("[data-reveal]");
    if (card) card.classList.add("is-visible");
  });
  window.addEventListener("beforeprint", revealAll);

  var navItems = Array.prototype.slice.call(document.querySelectorAll("#site-nav a[href^='#']"))
    .map(function (link) {
      var target = document.getElementById(link.hash.slice(1));
      return target ? { link: link, target: target } : null;
    }).filter(Boolean);

  function updatePage() {
    pendingFrame = false;
    if (masthead) masthead.classList.toggle("is-scrolled", window.scrollY > 12);
    var scrollRange = root.scrollHeight - window.innerHeight;
    root.style.setProperty("--reading-progress", scrollRange > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollRange)) : 1);
    if (!navItems.length) return;
    var focusLine = (parseFloat(getComputedStyle(root).getPropertyValue("--header-height")) || 76) + 48;
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
  var pendingFrame = false;
  function scheduleUpdate() {
    if (pendingFrame) return;
    pendingFrame = true;
    window.requestAnimationFrame(updatePage);
  }
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("load", scheduleUpdate);
  updatePage();
})();
