/*
 * 블로그 모양 보기: 실제 블로그와 같은 CSS(_sass를 컴파일한 /api/blog-style.css)와
 * 같은 HTML 구조(헤더 · 배너 · 제목 · 날짜/카테고리 · 본문)로 글을 iframe 안에 그린다.
 */
window.createBlogView = ({ config, renderMarkdown, previewLiquid, escapeHtml }) => {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
  const SEARCH_ICON = '<svg width="16" height="16" class="icon  icon--search" viewBox="0 0 16 16" role="img"><title>Search</title><path fill="currentColor" fill-rule="evenodd" d="M11.74 10.33a6.5 6.5 0 1 0-1.41 1.41l3.96 3.97a1 1 0 0 0 1.42-1.42l-3.97-3.96zM6.5 11a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>';
  const NAV_ICON = '<svg width="16" height="16" class="icon  icon--nav" viewBox="0 0 16 16"><path fill="currentColor" d="M1 3h14v2H1zm0 4h14v2H1zm0 4h14v2H1z"/></svg>';

  // hljs 토큰을 블로그(Rouge) 색 규칙에 맞는 클래스로 옮긴다.
  const ROUGE = {
    keyword: 'k', built_in: 'nb', type: 'kt', literal: 'kc', number: 'm', string: 's', regexp: 'sr', symbol: 'ss',
    comment: 'c1', doctag: 'cs', meta: 'cp', 'meta keyword': 'cp', title: 'nf', 'title function_': 'nf', 'title class_': 'nc',
    class: 'nc', function: 'nf', params: 'nv', variable: 'nv', 'variable language_': 'bp', attr: 'na', attribute: 'na',
    name: 'nt', tag: 'nt', 'selector-tag': 'nt', 'selector-class': 'nc', 'selector-id': 'ni', property: 'py',
    operator: 'o', punctuation: 'p', subst: 'si', addition: 'gi', deletion: 'gd', section: 'gh', bullet: 'm',
  };

  const site = () => config().site || {};
  const base = () => config().baseurl || '';
  const rel = (u) => (!u ? '' : /^[a-z]+:|^\/\//i.test(u) ? u : `${base()}${u.startsWith('/') ? '' : '/'}${u}`);
  const live = (u) => (/^[a-z]+:/i.test(u) ? u : `${(site().url || '').replace(/\/$/, '')}${rel(u)}`);

  function formatDate(iso, fmt) {
    const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return iso;
    return String(fmt || '%-d %B %Y').replace(/%(-?)([a-zA-Z%])/g, (all, nopad, k) => {
      const pad = (n) => (nopad ? String(n) : String(n).padStart(2, '0'));
      switch (k) {
        case 'd': return pad(d);
        case 'e': return String(d);
        case 'm': return pad(m);
        case 'B': return MONTHS[m - 1];
        case 'b': return MONTHS_SHORT[m - 1];
        case 'Y': return String(y);
        case 'y': return String(y).slice(2);
        case '%': return '%';
        default: return all;
      }
    });
  }

  // 미리보기용 HTML을 kramdown/Rouge가 만드는 모양으로 다듬는다.
  function blogify(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    tpl.content.querySelectorAll('pre > code').forEach((code) => {
      const pre = code.parentElement;
      const lang = ([...code.classList].find((c) => c.startsWith('language-')) || '').slice(9);
      code.querySelectorAll('[class*="hljs-"]').forEach((span) => {
        const key = [...span.classList].map((c) => c.replace(/^hljs-/, '')).join(' ');
        const short = ROUGE[key] || ROUGE[key.split(' ')[0]];
        span.className = short || '';
      });
      code.removeAttribute('class');
      const wrap = document.createElement('div');
      wrap.className = `${lang ? `language-${lang} ` : ''}highlighter-rouge`;
      wrap.innerHTML = '<div class="highlight"></div>';
      pre.className = 'highlight';
      pre.replaceWith(wrap);
      wrap.firstChild.append(pre);
    });
    const used = new Set();
    tpl.content.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
      if (h.id) return;
      // kramdown auto_ids와 같은 규칙: 소문자, 글자·숫자·공백·-만 남기고 공백은 -
      let id = h.textContent.toLowerCase().replace(/[^\p{L}\p{N}\p{M} _-]/gu, '').trim().replace(/ /g, '-') || 'section';
      for (let n = 1, b = id; used.has(id); n++) id = `${b}-${n}`;
      used.add(id);
      h.id = id;
    });
    tpl.content.querySelectorAll('a[href]').forEach((a) => {
      if (!a.getAttribute('href').startsWith('#')) { a.target = '_blank'; a.rel = 'noopener'; }
    });
    const box = document.createElement('div');
    box.append(tpl.content);
    return box.innerHTML;
  }

  function featureTextOf(data) {
    if (data.featureText != null && data.featureText !== '') return data.featureText;
    return data.tagline ? `## ${data.title}\n${data.tagline}` : '';
  }

  // post-nav.html처럼 h2·h3로 목차를 만든다(본문에 h2가 있을 때만).
  function tocHtml(bodyHtml) {
    const tpl = document.createElement('template');
    tpl.innerHTML = bodyHtml;
    const heads = [...tpl.content.querySelectorAll('h2, h3')];
    if (!heads.some((h) => h.tagName === 'H2')) return '';
    const start = heads.findIndex((h) => h.tagName === 'H2');
    const items = heads.slice(start).map((h) => `<li class="toc__item  toc__item--${h.tagName.toLowerCase()}"><a href="#${escapeHtml(h.id)}">${escapeHtml(h.textContent.trim())}</a></li>`);
    return `<aside class="toc" aria-label="Table of contents"><nav class="toc__nav"><p class="toc__title">Index</p><ul class="toc__list">${items.join('')}</ul></nav></aside>`;
  }

  function pageHtml(data) {
    const s = site();
    const body = blogify(renderMarkdown(data.body || '', data.lineBreaks));
    // 글은 기본이 heads: true (_config.yml defaults). 앞부분에 heads: false가 있으면 끈다.
    const heads = !(data.extra || []).some((l) => /^heads:\s*false\b/.test(l));
    const toc = heads ? tocHtml(body) : '';
    const featureImage = previewLiquid(data.featureImage || '') || rel(s.defaultFeatureImage || '');
    const featureText = featureTextOf(data);
    const nav = (s.nav || []).map((item) => `<li class="item  item--nav">${item.title === 'Search'
      ? `<a class="search-btn" href="${escapeHtml(live(item.url))}" target="_blank" aria-label="Search">${SEARCH_ICON}</a>`
      : `<a href="${escapeHtml(live(item.url))}" target="_blank">${escapeHtml(item.title)}</a>`}</li>`).join('');
    const tags = (data.categories || []).length
      ? `<ul class="tags">${data.categories.map((c) => `<li><a class="tag">${escapeHtml(c)}</a></li>`).join('')}</ul>` : '';
    const font = (w, file) => `@font-face{font-family:"D2Coding";font-style:normal;font-weight:${w};font-display:swap;src:url("${rel(`/assets/fonts/${file}`)}") format("woff2");}`;
    return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="color-scheme" content="dark">
<link rel="stylesheet" href="/api/blog-style.css">
<style>${font(400, 'D2Coding-Regular.woff2')}${font(700, 'D2Coding-Bold.woff2')}
body{min-height:0!important}.header{position:relative!important}</style></head>
<body class="layout-post">
<header class="header"><div class="container  header__inner">
${s.logo ? `<a class="logo" href="${escapeHtml(live('/'))}" target="_blank"><img src="${escapeHtml(rel(s.logo))}" alt="" width="28" height="28"/><span class="logo__title">${escapeHtml(s.title || '')}</span></a>` : ''}
<nav class="nav  nav--header" aria-label="Main"><button class="nav__toggle" type="button" aria-label="Menu">${NAV_ICON}</button><ul class="list  list--nav">${nav}</ul></nav>
</div></header>
${featureText || featureImage ? `<div class="feature${featureImage ? '  feature--image' : ''}"${featureImage ? ` style="background-image: url('${escapeHtml(featureImage.replace(/'/g, '%27'))}')"` : ''}><div class="container  feature__inner">${featureText ? blogify(renderMarkdown(featureText, false)) : ''}</div></div>` : ''}
<main class="main  container${toc ? '  main--with-toc' : ''}">${toc}<article class="article  article--post  content">
<header class="article__header"><h1 class="article__title">${escapeHtml(data.title || '(제목 없음)')}</h1>
<div class="post-meta"><time class="post-meta__date">${escapeHtml(formatDate(data.date, s.dateFormat))}</time>${tags}</div></header>
<div class="markdown-body">${body}</div>
</article></main>
</body></html>`;
  }

  // container 안에 iframe을 새로 만들어 그린다. 높이는 내용에 맞춰 늘어난다.
  function render(container, data) {
    const frame = document.createElement('iframe');
    frame.className = 'blog-frame';
    frame.title = '블로그에서 보이는 모습';
    frame.srcdoc = pageHtml(data);
    frame.addEventListener('load', () => {
      const doc = frame.contentDocument;
      if (!doc) return;
      const fit = () => {
        const border = frame.offsetHeight - frame.clientHeight;
        frame.style.height = `${Math.max(200, doc.documentElement.scrollHeight) + border}px`;
      };
      fit();
      new ResizeObserver(fit).observe(doc.body);
      doc.addEventListener('load', fit, true); // 그림이 늦게 뜰 때
      // 목차 링크: iframe은 내용 높이만큼 늘어나 있으므로 바깥(편집기 화면)을 스크롤한다.
      doc.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        e.preventDefault();
        const target = doc.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
        const scroller = container.closest('.main');
        if (!target || !scroller) return;
        const y = frame.getBoundingClientRect().top + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        scroller.scrollBy({ top: y - 16, behavior: 'smooth' });
      });
      // 블로그 CSS를 못 받았으면(배경색이 없으면) 알려 준다.
      if (getComputedStyle(doc.body).backgroundColor === 'rgba(0, 0, 0, 0)') {
        container.dispatchEvent(new CustomEvent('blogstyle-error'));
      }
    });
    container.replaceChildren(frame);
  }

  return { render, formatDate };
};
