(function () {
  "use strict";

  var root = document.documentElement;
  var masthead = document.querySelector(".masthead");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function updateHeader() {
    if (masthead) {
      masthead.classList.toggle("is-scrolled", window.scrollY > 12);
    }
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  var revealElements = Array.prototype.slice.call(
    document.querySelectorAll("[data-reveal]")
  );

  if (!reduceMotion && "IntersectionObserver" in window) {
    root.classList.add("js-enhanced");

    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    revealElements.forEach(function (element) {
      revealObserver.observe(element);
    });
  } else {
    revealElements.forEach(function (element) {
      element.classList.add("is-visible");
    });
  }

  var navItems = Array.prototype.slice
    .call(document.querySelectorAll("#site-nav a[href^='#']"))
    .map(function (link) {
      var target = document.querySelector(link.getAttribute("href"));
      return target ? { link: link, target: target } : null;
    })
    .filter(Boolean);

  if (navItems.length) {
    function updateActiveNav() {
      var focusLine = window.scrollY + window.innerHeight * 0.35;
      var activeTarget = navItems[0].target;

      navItems.forEach(function (item) {
        var targetTop = item.target.getBoundingClientRect().top + window.scrollY;
        if (targetTop <= focusLine) activeTarget = item.target;
      });

      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        activeTarget = navItems[navItems.length - 1].target;
      }

      navItems.forEach(function (item) {
        var isActive = item.target.id === activeTarget.id;
        item.link.classList.toggle("is-active", isActive);
        if (isActive) {
          item.link.setAttribute("aria-current", "location");
        } else {
          item.link.removeAttribute("aria-current");
        }
      });
    }

    updateActiveNav();
    window.addEventListener("scroll", updateActiveNav, { passive: true });
  }
})();
