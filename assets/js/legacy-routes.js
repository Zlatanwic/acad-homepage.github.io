(function () {
  "use strict";

  // Old bookmarks continue to work after replacing the scrolling homepage.
  // Resolve routes from rendered links so project and custom-domain URLs agree.
  var gateway = document.querySelector("[data-space-gateway]");
  if (!gateway) return;
  var routes = {
    "about-me": ["profile", ""],
    "profile": ["profile", ""],
    "contact": ["profile", "contact"],
    "news": ["education", "news"],
    "research-interests": ["research", ""],
    "publications": ["projects", "publications"],
    "education": ["education", ""],
    "research-experience": ["education", "research-experience"],
    "projects": ["projects", ""],
    "personal-interests": ["interests", ""]
  };

  function redirectLegacyHash() {
    var hash;
    try { hash = decodeURIComponent(window.location.hash.slice(1)); } catch (_) { return; }
    if (!Object.prototype.hasOwnProperty.call(routes, hash)) return;
    var route = routes[hash];
    var link = gateway.querySelector('[data-destination="' + route[0] + '"]');
    if (!link) return;
    var href = link.getAttribute("href");
    if (!href) return;
    try {
      var target = new URL(href, window.location.href);
      if (target.origin !== window.location.origin || !/^https?:$/.test(target.protocol) ||
          target.pathname === window.location.pathname) return;
      target.hash = route[1];
      window.location.replace(target.href);
    } catch (_) { /* A malformed or missing link must leave normal navigation available. */ }
  }

  redirectLegacyHash();
  window.addEventListener("hashchange", redirectLegacyHash);
})();
