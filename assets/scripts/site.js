(function () {
  'use strict';

  // Mobile navigation toggle
  var nav = document.querySelector('.nav--header');
  var toggle = nav && nav.querySelector('.nav__toggle');

  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Analytics notice: shown until dismissed, with an opt-out that really stops collection
  var notice = document.querySelector('[data-analytics-notice]');
  if (notice) {
    var remember = function (key, value) {
      try { localStorage.setItem(key, value); } catch (error) { /* storage blocked */ }
    };
    var seen = null;
    try { seen = localStorage.getItem('analytics-notice'); } catch (error) { seen = 'seen'; }
    if (!seen) {
      notice.hidden = false;
      // Keep the fixed notice from covering the end of the page
      document.body.classList.add('has-notice');
    }

    var close = function () {
      remember('analytics-notice', 'seen');
      notice.hidden = true;
      document.body.classList.remove('has-notice');
    };

    notice.querySelector('[data-analytics-dismiss]').addEventListener('click', close);
    notice.querySelector('[data-analytics-optout]').addEventListener('click', function () {
      remember('analytics-opt-out', '1');
      var tag = document.querySelector('script[src*="googletagmanager.com/gtag/js?id="]');
      var id = tag ? tag.src.split('id=')[1].split('&')[0] : '';
      if (id) {
        window['ga-disable-' + id] = true;
      }
      notice.querySelector('.notice__text').textContent = '이 브라우저에서는 더 이상 수집하지 않습니다.';
      setTimeout(close, 1500);
    });
  }

  // Code blocks: language label and copy button
  var blocks = document.querySelectorAll('.markdown-body div.highlighter-rouge, .markdown-body figure.highlight');

  Array.prototype.forEach.call(blocks, function (block) {
    var pre = block.querySelector('pre');
    if (!pre) {
      return;
    }

    var code = block.querySelector('code[data-lang]');
    var match = block.className.match(/\blanguage-([\w+#.-]+)/);
    var lang = code ? code.getAttribute('data-lang') : (match ? match[1] : 'plaintext');

    var toolbar = document.createElement('div');
    toolbar.className = 'code-toolbar';

    var label = document.createElement('span');
    label.className = 'code-toolbar__lang';
    label.textContent = lang === 'plaintext' ? 'text' : lang;
    toolbar.appendChild(label);

    if (navigator.clipboard && window.isSecureContext) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'code-toolbar__copy';
      button.textContent = 'Copy';

      button.addEventListener('click', function () {
        navigator.clipboard.writeText(pre.textContent.replace(/\n$/, '')).then(function () {
          button.textContent = 'Copied';
        }, function () {
          button.textContent = 'Failed';
        });
        setTimeout(function () {
          button.textContent = 'Copy';
        }, 1500);
      });

      toolbar.appendChild(button);
    }

    block.insertBefore(toolbar, block.firstChild);
  });
})();
