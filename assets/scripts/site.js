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
