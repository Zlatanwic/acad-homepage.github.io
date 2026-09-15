(function () {
  'use strict';

  function normalize(value) {
    var text = String(value || '');
    if (typeof text.normalize === 'function') text = text.normalize('NFKC');
    return text.toLowerCase();
  }

  function enhanceIndex() {
    var index = document.querySelector('[data-blog-index]');
    if (!index || index.getAttribute('data-blog-enhanced') === 'true') return;

    var controls = index.querySelector('[data-blog-controls]');
    var search = index.querySelector('#blog-search');
    var tag = index.querySelector('#blog-tag');
    var status = index.querySelector('[data-blog-status]');
    var empty = index.querySelector('[data-blog-no-results]');
    var cards = Array.prototype.slice.call(index.querySelectorAll('[data-blog-card]'));
    if (!cards.length) {
      if (controls) controls.hidden = true;
      if (empty) empty.hidden = true;
      if (status) status.textContent = 'No posts published yet.';
      return;
    }
    // Without working controls, retain the complete server-rendered archive.
    if (!controls || !search || !tag) return;

    var records = cards.map(function (card) {
      var tags = [];
      try {
        var parsed = JSON.parse(card.getAttribute('data-tags') || '[]');
        if (Array.isArray(parsed)) {
          tags = parsed.filter(function (value) { return typeof value === 'string'; });
        }
      } catch (error) { /* Malformed metadata must not hide an otherwise readable post. */ }
      return { element: card, text: normalize(card.getAttribute('data-search')), tags: tags };
    });

    function currentUrl() {
      if (typeof window.URL !== 'function') return null;
      try { return new window.URL(window.location.href); } catch (error) { return null; }
    }

    function readQuery() {
      var url = currentUrl();
      if (!url || !url.searchParams) return;
      search.value = url.searchParams.get('q') || '';
      var requestedTag = url.searchParams.get('tag') || '';
      var available = Array.prototype.some.call(tag.options, function (option) {
        return option.value === requestedTag;
      });
      tag.value = available ? requestedTag : '';
    }

    function writeQuery() {
      var url = currentUrl();
      if (!url || !url.searchParams || !window.history || !window.history.replaceState) return;
      if (search.value.trim()) url.searchParams.set('q', search.value);
      else url.searchParams.delete('q');
      if (tag.value) url.searchParams.set('tag', tag.value);
      else url.searchParams.delete('tag');
      var next = url.pathname + url.search + url.hash;
      var previous = window.location.pathname + window.location.search + window.location.hash;
      if (next === previous) return;
      try {
        window.history.replaceState(window.history.state, '', next);
      } catch (error) { /* Filtering still works in privacy-restricted or rate-limited browsers. */ }
    }

    function filter(updateUrl) {
      var terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
      var visible = 0;
      records.forEach(function (record) {
        var matches = (!tag.value || record.tags.indexOf(tag.value) !== -1) && terms.every(function (term) {
          return record.text.indexOf(term) !== -1;
        });
        record.element.hidden = !matches;
        if (matches) visible += 1;
      });
      if (empty) empty.hidden = visible !== 0;
      if (status) {
        status.textContent = 'Showing ' + visible + ' of ' + records.length + (records.length === 1 ? ' post.' : ' posts.');
      }
      if (updateUrl) writeQuery();
    }

    search.addEventListener('input', function () { filter(true); });
    tag.addEventListener('change', function () { filter(true); });
    Array.prototype.forEach.call(index.querySelectorAll('[data-blog-reset]'), function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        search.value = '';
        tag.value = '';
        filter(true);
        search.focus();
      });
    });
    window.addEventListener('popstate', function () { readQuery(); filter(false); });
    readQuery();
    filter(false);
    controls.hidden = false;
    index.setAttribute('data-blog-enhanced', 'true');
  }

  function enhanceContents() {
    var content = document.getElementById('post-content');
    var toc = document.querySelector('[data-blog-toc]');
    if (!toc) return;
    var list = toc.querySelector('[data-blog-toc-list]');
    toc.hidden = true;
    if (!content || !list) return;
    list.textContent = '';
    var count = 0;
    Array.prototype.forEach.call(content.querySelectorAll('h2[id], h3[id]'), function (heading) {
      var title = heading.textContent.trim();
      if (!title || !heading.id) return;
      var fragment;
      try { fragment = '#' + encodeURIComponent(heading.id); } catch (error) { return; }
      var item = document.createElement('li');
      var link = document.createElement('a');
      if (heading.tagName.toLowerCase() === 'h3') item.className = 'blog-toc-subitem';
      link.textContent = title;
      link.setAttribute('href', fragment);
      item.appendChild(link);
      list.appendChild(item);
      count += 1;
    });
    toc.hidden = count === 0;
  }

  function initialize() {
    enhanceIndex();
    enhanceContents();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
