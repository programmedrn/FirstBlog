(function () {
  'use strict';

  var root = document.querySelector('[data-search-endpoint]');
  if (!root) {
    return;
  }

  var input = root.querySelector('#search');
  var list = root.querySelector('#search-results');
  var status = root.querySelector('#search-status');
  var pages = [];

  // search.json holds HTML-escaped text; decode it in an inert document (nothing is executed or loaded)
  function decode(text) {
    var doc = new DOMParser().parseFromString('<!doctype html><body>' + String(text || ''), 'text/html');
    return doc.body.textContent || '';
  }

  // Only follow site-relative links from the index
  function safeUrl(url) {
    url = String(url || '');
    return url.charAt(0) === '/' && url.charAt(1) !== '/' ? url : '#';
  }

  function render() {
    // Plain substring match: user input is never turned into a RegExp or HTML
    var term = input.value.trim().toLowerCase();
    list.textContent = '';

    if (!term) {
      status.textContent = '';
      return;
    }

    var results = pages.filter(function (item) {
      return item.titleLower.indexOf(term) !== -1 || item.contentLower.indexOf(term) !== -1;
    });

    status.textContent = results.length ? results.length + ' result' + (results.length > 1 ? 's' : '') : 'Sorry, nothing was found';

    results.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'item  item--result';

      var link = document.createElement('a');
      link.className = 'search-result';
      link.href = safeUrl(item.url);

      var title = document.createElement('h3');
      title.className = 'search-result__title';
      title.textContent = item.title;
      link.appendChild(title);

      if (item.excerpt) {
        var excerpt = document.createElement('p');
        excerpt.className = 'search-result__excerpt';
        excerpt.textContent = item.excerpt;
        link.appendChild(excerpt);
      }

      li.appendChild(link);
      list.appendChild(li);
    });
  }

  fetch(root.getAttribute('data-search-endpoint'))
    .then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    })
    .then(function (data) {
      pages = data.map(function (item) {
        var title = String(item.title || '');
        var content = decode(item.content);
        return {
          title: title,
          url: item.url,
          excerpt: decode(item.excerpt).trim(),
          titleLower: title.toLowerCase(),
          contentLower: content.toLowerCase()
        };
      });
      render();
    })
    .catch(function () {
      status.textContent = 'The search index could not be loaded.';
    });

  input.addEventListener('input', render);
})();
