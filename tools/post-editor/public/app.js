(() => {
  const $ = (sel) => document.querySelector(sel);
  const els = {
    themeToggle: $('#themeToggle'), newBtn: $('#newBtn'), uploadBtn: $('#uploadBtn'), pendingCount: $('#pendingCount'),
    searchInput: $('#searchInput'), draftList: $('#draftList'), postList: $('#postList'),
    draftCount: $('#draftCount'), postCount: $('#postCount'),
    emptyState: $('#emptyState'), viewPane: $('#viewPane'), editPane: $('#editPane'),
    viewKind: $('#viewKind'), viewDate: $('#viewDate'), viewTags: $('#viewTags'), viewTitle: $('#viewTitle'),
    viewExcerpt: $('#viewExcerpt'), viewBlog: $('#viewBlog'), viewFeature: $('#viewFeature'), viewContent: $('#viewContent'), viewFile: $('#viewFile'),
    editBtn: $('#editBtn'), viewPublishBtn: $('#viewPublishBtn'), deleteBtn: $('#deleteBtn'),
    fTitle: $('#fTitle'), fDate: $('#fDate'), fCategories: $('#fCategories'), fExcerpt: $('#fExcerpt'),
    fTagline: $('#fTagline'), fFeature: $('#fFeature'), fLineBreaks: $('#fLineBreaks'), fBody: $('#fBody'),
    metaDetails: $('#metaDetails'), firstImageBtn: $('#firstImageBtn'),
    editToolbar: $('#editToolbar'), mediaInput: $('#mediaInput'), editorArea: $('#editorArea'), preview: $('#preview'),
    publishBtn: $('#publishBtn'), cancelBtn: $('#cancelBtn'), saveState: $('#saveState'),
    uploadDialog: $('#uploadDialog'), uploadInfo: $('#uploadInfo'), changeList: $('#changeList'),
    commitMsg: $('#commitMsg'), uploadLog: $('#uploadLog'), doUploadBtn: $('#doUploadBtn'), toast: $('#toast'),
  };

  const state = {
    config: { baseurl: '' },
    drafts: [],
    posts: [],
    current: null,   // 보고 있는 글: { kind: 'draft'|'post', data }
    editing: null,   // 편집 중: { id, postFile }
    dirty: false,
  };

  // ---------- 유틸 ----------
  function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function todayStr() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }
  let toastTimer;
  function toast(msg, kind = '') {
    els.toast.textContent = msg;
    els.toast.className = `toast ${kind}`;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, kind === 'error' ? 7000 : 3000);
  }
  async function api(url, opts = {}) {
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }
  const jsonOpts = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  // ---------- 테마 ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    els.themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    try { localStorage.setItem('post-editor-theme', theme); } catch (_) { /* 저장 못 해도 동작 */ }
  }
  let savedTheme = 'dark';
  try { savedTheme = localStorage.getItem('post-editor-theme') || 'dark'; } catch (_) { /* 기본값 */ }
  applyTheme(savedTheme);
  els.themeToggle.addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  // ---------- 마크다운 렌더링 ----------
  function renderCode(text, lang) {
    const language = (lang || '').trim().split(/\s+/)[0].toLowerCase();
    let value;
    let used = null;
    if (language && typeof hljs !== 'undefined' && hljs.getLanguage(language)) {
      value = hljs.highlight(text, { language }).value; used = language;
    } else if (language || typeof hljs === 'undefined') {
      value = escapeHtml(text);
    } else {
      const auto = hljs.highlightAuto(text); value = auto.value; used = auto.language;
    }
    return `<pre><code class="hljs${used ? ` language-${used}` : ''}">${value}</code></pre>\n`;
  }
  marked.use({
    gfm: true,
    renderer: { code: ({ text, lang }) => renderCode(text, lang) },
    tokenizer: {
      // <img>로 시작하는 줄은 블로그(kramdown)처럼 문단 속 그림으로 읽는다.
      // marked 기본값은 빈 줄까지를 HTML 덩어리로 보아, 바로 아랫줄의 ![..](..)가 글자로 나왔다.
      html(src) { return /^ {0,3}<img\b/i.test(src) ? undefined : false; },
    },
  });

  // Jekyll에서만 의미가 있는 Liquid 구문을 미리보기용 HTML로 바꾼다.
  function previewLiquid(src) {
    const base = state.config.baseurl;
    return src
      .replace(/\{\{-?\s*site\.baseurl\s*-?\}\}/g, base)
      .replace(/\{%-?\s*include\s+figure\.html\s+([^%]*?)-?%\}/g, (m, args) => {
        const img = (args.match(/image="([^"]+)"/) || [])[1];
        const cap = (args.match(/caption="([^"]+)"/) || [])[1];
        return img ? `<figure><img src="${escapeHtml(img)}" alt="">${cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : ''}</figure>` : m;
      })
      .replace(/\{%-?\s*include\s+video\.html\s+([^%]*?)-?%\}/g, (m, args) => {
        const id = (args.match(/id="([^"]+)"/) || [])[1];
        return id ? `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${encodeURIComponent(id)}" allowfullscreen></iframe></div>` : m;
      });
  }
  function renderMarkdown(src, lineBreaks) {
    const withVideo = previewLiquid(src || '').replace(
      /!\[([^\]]*)\]\(\s*<?([^)\s>]+\.(?:mp4|webm|mov|m4v))>?\s*\)/gi,
      (m, alt, url) => `<video controls preload="metadata" src="${escapeHtml(url)}"></video>`,
    );
    return marked.parse(withVideo, { breaks: lineBreaks });
  }

  // 글 속 링크는 새 창(트레이 앱에서는 기본 브라우저)으로 연다. 편집 화면이 바뀌지 않게.
  function linksInNewWindow(root) {
    root.querySelectorAll('a[href]').forEach((a) => {
      if (a.getAttribute('href').startsWith('#')) return;
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  // ---------- 목록 ----------
  async function loadLists() {
    try {
      const [drafts, posts] = await Promise.all([api('/api/drafts'), api('/api/posts')]);
      state.drafts = drafts;
      state.posts = posts;
    } catch (err) {
      toast(`목록을 불러오지 못했습니다: ${err.message}`, 'error');
    }
    renderLists();
    refreshPending();
  }

  function matches(item, q) {
    if (!q) return true;
    const hay = [item.title, item.excerpt, (item.categories || []).join(' '), item.date].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  }

  function itemRow({ title, date, categories, excerpt, badges, active, onClick }) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `entry-item${active ? ' active' : ''}`;
    row.innerHTML = `
      <div class="entry-head"><h3>${escapeHtml(title || '(제목 없음)')}</h3>${badges.map((b) => `<span class="badge ${b[0]}">${escapeHtml(b[1])}</span>`).join('')}</div>
      <div class="entry-date">${escapeHtml(date || '')}</div>
      <div class="entry-excerpt">${escapeHtml(excerpt || '')}</div>
      <div class="entry-tags">${(categories || []).map((c) => `<span class="mini-tag">${escapeHtml(c)}</span>`).join('')}</div>`;
    row.addEventListener('click', onClick);
    return row;
  }

  function renderLists() {
    const q = els.searchInput.value.trim();
    const cur = state.current;
    const drafts = state.drafts.filter((d) => matches(d, q));
    const posts = state.posts.filter((p) => matches(p, q));
    els.draftCount.textContent = `(${drafts.length})`;
    els.postCount.textContent = `(${posts.length})`;

    els.draftList.innerHTML = drafts.length ? '' : '<div class="empty-list-msg">초안이 없습니다.</div>';
    drafts.forEach((d) => els.draftList.appendChild(itemRow({
      ...d,
      badges: d.postFile ? [['edit', '발행글 수정']] : [['new', '새 글']],
      active: cur && cur.kind === 'draft' && cur.data.id === d.id,
      onClick: () => guard(() => openDraft(d.id)),
    })));

    els.postList.innerHTML = posts.length ? '' : '<div class="empty-list-msg">발행된 글이 없습니다.</div>';
    posts.forEach((p) => els.postList.appendChild(itemRow({
      ...p,
      badges: [...(p.pending ? [['pending', '업로드 전']] : []), ...(p.draftId ? [['edit', '수정 중']] : [])],
      active: cur && cur.kind === 'post' && cur.data.postFile === p.postFile,
      onClick: () => guard(() => openPost(p.postFile)),
    })));
  }
  els.searchInput.addEventListener('input', debounce(renderLists, 150));

  async function refreshPending() {
    try {
      const st = await api('/api/git/status');
      const n = st.changes.length;
      els.pendingCount.textContent = n + (st.ahead ? `+${st.ahead}` : '');
      els.uploadBtn.classList.toggle('has-pending', n > 0 || st.ahead > 0);
      return st;
    } catch (_) {
      els.pendingCount.textContent = '?';
      return null;
    }
  }

  // ---------- 화면 전환 ----------
  function showPane(name) {
    els.emptyState.hidden = name !== 'empty';
    els.viewPane.hidden = name !== 'view';
    els.editPane.hidden = name !== 'edit';
  }
  // 편집 중 저장하지 않은 내용이 있으면 다른 글로 넘어가기 전에 물어본다.
  function guard(fn) {
    if (!els.editPane.hidden && state.dirty && !confirm('저장하지 않은 내용이 있습니다. 버리고 이동할까요?')) return;
    state.dirty = false;
    fn();
  }
  // 트레이 앱이 종료 전에 저장 안 된 내용이 있는지 물어볼 때 쓴다.
  window.__postEditorDirty = () => state.dirty;
  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  function renderView(kind, data) {
    state.current = { kind, data };
    els.viewKind.textContent = kind === 'draft' ? (data.postFile ? '초안 · 발행글 수정' : '초안') : '발행됨';
    els.viewKind.className = `pill kind ${kind}`;
    els.viewDate.textContent = data.date;
    els.viewTags.innerHTML = (data.categories || []).map((c) => `<span class="pill">${escapeHtml(c)}</span>`).join('');
    els.viewTitle.textContent = data.title || '(제목 없음)';
    $('#viewExcerptText').textContent = data.excerpt || '';
    els.viewExcerpt.hidden = !data.excerpt;
    if (viewMode === 'blog') {
      blogView.render(els.viewBlog, data);
    } else {
      els.viewBlog.replaceChildren();
      els.viewFeature.hidden = !data.featureImage;
      if (data.featureImage) els.viewFeature.src = previewLiquid(data.featureImage);
      els.viewContent.innerHTML = renderMarkdown(data.body, data.lineBreaks);
      linksInNewWindow(els.viewContent);
    }
    els.viewFile.textContent = kind === 'post'
      ? `_posts/${data.postFile}`
      : (data.postFile ? `발행하면 _posts/${data.postFile} 를 덮어씁니다` : '아직 발행되지 않은 초안');
    els.viewPublishBtn.hidden = kind !== 'draft';
    els.deleteBtn.hidden = kind !== 'draft';
    showPane('view');
    renderLists();
  }

  // 보기 방식: 블로그 모양(블로그 CSS로 그린 iframe) / 간단히(편집기 스타일)
  const blogView = window.createBlogView({ config: () => state.config, renderMarkdown, previewLiquid, escapeHtml });
  let viewMode = 'blog';
  try { viewMode = localStorage.getItem('post-editor-view') || 'blog'; } catch (_) { /* 기본값 */ }
  function setViewMode(mode) {
    viewMode = mode;
    els.viewPane.dataset.view = mode;
    document.querySelectorAll('.view-seg .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === mode));
    try { localStorage.setItem('post-editor-view', mode); } catch (_) { /* 무시 */ }
  }
  setViewMode(viewMode);
  document.querySelectorAll('.view-seg .seg-btn').forEach((btn) => btn.addEventListener('click', () => {
    setViewMode(btn.dataset.view);
    if (state.current) renderView(state.current.kind, state.current.data);
  }));
  els.viewBlog.addEventListener('blogstyle-error', () => {
    toast('블로그 CSS를 만들지 못해 블로그 모양으로 보여 줄 수 없습니다. 간단히 보기로 바꿉니다.', 'error');
    setViewMode('simple');
    if (state.current) renderView(state.current.kind, state.current.data);
  });

  async function openDraft(id) {
    try { renderView('draft', await api(`/api/drafts/${id}`)); } catch (err) { toast(err.message, 'error'); }
  }
  async function openPost(name) {
    try { renderView('post', await api(`/api/posts/${encodeURIComponent(name)}`)); } catch (err) { toast(err.message, 'error'); }
  }

  // ---------- 편집 ----------
  function fillForm(d) {
    els.fTitle.value = d.title || '';
    els.fDate.value = d.date || todayStr();
    els.fCategories.value = (d.categories || []).join(', ');
    els.fExcerpt.value = d.excerpt || '';
    els.fTagline.value = d.tagline || '';
    els.fFeature.value = d.featureImage || '';
    els.fLineBreaks.checked = d.lineBreaks !== false;
    els.fBody.value = d.body || '';
    els.metaDetails.open = Boolean(d.excerpt || d.tagline || d.featureImage);
    growMeta();
    state.dirty = false;
    els.saveState.textContent = '';
    updatePreview();
  }
  function formData() {
    return {
      title: els.fTitle.value.trim(),
      date: els.fDate.value || todayStr(),
      categories: els.fCategories.value,
      excerpt: els.fExcerpt.value,
      tagline: els.fTagline.value,
      featureImage: els.fFeature.value,
      lineBreaks: els.fLineBreaks.checked,
      body: els.fBody.value,
      postFile: state.editing.postFile,
    };
  }

  function startEdit(data, { id = null, postFile = null } = {}) {
    state.editing = { id, postFile };
    fillForm(data);
    showPane('edit');
    els.fTitle.focus();
  }

  els.newBtn.addEventListener('click', () => guard(() => {
    state.current = null;
    renderLists();
    startEdit({ date: todayStr(), lineBreaks: true });
  }));

  els.editBtn.addEventListener('click', async () => {
    const cur = state.current;
    if (!cur) return;
    if (cur.kind === 'draft') return startEdit(cur.data, { id: cur.data.id, postFile: cur.data.postFile });
    // 발행글: 이미 수정 중인 초안이 있으면 그걸 이어서 고친다.
    const existing = state.drafts.find((d) => d.postFile === cur.data.postFile);
    if (existing) {
      const draft = await api(`/api/drafts/${existing.id}`);
      toast('이 글을 고치던 초안을 이어서 엽니다.');
      return startEdit(draft, { id: draft.id, postFile: draft.postFile });
    }
    startEdit(cur.data, { postFile: cur.data.postFile });
  });

  els.cancelBtn.addEventListener('click', () => guard(() => {
    const cur = state.current;
    if (cur) renderView(cur.kind, cur.data); else showPane('empty');
  }));

  async function save({ quiet = false } = {}) {
    const payload = formData();
    if (!payload.title) { els.fTitle.focus(); throw new Error('제목을 입력하세요.'); }
    const id = state.editing.id;
    const draft = await api(id ? `/api/drafts/${id}` : '/api/drafts', jsonOpts(id ? 'PUT' : 'POST', payload));
    state.editing = { id: draft.id, postFile: draft.postFile };
    state.current = { kind: 'draft', data: draft };
    state.dirty = false;
    els.saveState.textContent = `저장됨 ${new Date().toLocaleTimeString()}`;
    if (!quiet) toast('초안을 저장했습니다.');
    loadLists();
    return draft;
  }

  // 이미지를 붙여넣으려면 초안 id가 필요해서, 새 글이면 먼저 조용히 저장한다.
  async function ensureDraftId() {
    if (state.editing.id) return state.editing.id;
    if (!els.fTitle.value.trim()) els.fTitle.value = '제목 없음';
    const draft = await save({ quiet: true });
    return draft.id;
  }

  els.editPane.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const draft = await save();
      renderView('draft', draft);
    } catch (err) { toast(err.message, 'error'); }
  });

  async function publishDraft(id) {
    const result = await api(`/api/drafts/${id}/publish`, { method: 'POST' });
    state.dirty = false;
    toast(`발행했습니다: _posts/${result.postFile} — 블로그에 올리려면 ⬆ 업로드를 누르세요.`);
    await loadLists();
    await openPost(result.postFile);
  }

  els.publishBtn.addEventListener('click', async () => {
    try {
      const draft = await save({ quiet: true });
      await publishDraft(draft.id);
    } catch (err) { toast(err.message, 'error'); }
  });
  els.viewPublishBtn.addEventListener('click', async () => {
    const cur = state.current;
    if (!cur || cur.kind !== 'draft') return;
    try { await publishDraft(cur.data.id); } catch (err) { toast(err.message, 'error'); }
  });

  els.deleteBtn.addEventListener('click', async () => {
    const cur = state.current;
    if (!cur || cur.kind !== 'draft') return;
    const note = cur.data.postFile ? '\n(발행된 글은 그대로 남습니다)' : '';
    if (!confirm(`"${cur.data.title || '제목 없음'}" 초안을 삭제할까요?${note}`)) return;
    try {
      await api(`/api/drafts/${cur.data.id}`, { method: 'DELETE' });
      const back = cur.data.postFile;
      state.current = null;
      await loadLists();
      if (back) openPost(back); else showPane('empty');
    } catch (err) { toast(err.message, 'error'); }
  });

  // ---------- 요약·배너 칸: 내용만큼 늘어나는 한 줄 값 ----------
  // 저장할 때 줄바꿈은 공백으로 합쳐지므로 Enter는 막고, 길면 화면에서만 여러 줄로 보여 준다.
  const metaBoxes = [[els.fExcerpt, $('#excerptCount'), 200], [els.fTagline, $('#taglineCount'), 80]];
  function growMeta() {
    for (const [box, counter, limit] of metaBoxes) {
      box.style.height = 'auto';
      box.style.height = `${box.scrollHeight + 2}px`;
      const n = box.value.length;
      counter.textContent = n ? `${n}자` : '';
      counter.classList.toggle('over', n > limit);
      counter.title = `권장 ${limit}자 이내`;
    }
  }
  for (const [box] of metaBoxes) {
    box.addEventListener('input', growMeta);
    box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) e.preventDefault(); });
  }
  els.metaDetails.addEventListener('toggle', growMeta);
  window.addEventListener('resize', debounce(growMeta, 100));

  // ---------- 미리보기 ----------
  // 미리보기에서 그림을 눌러 크기·정렬을 바꾸고, 끌어서 한 줄로 묶는다(imageLayout.js).
  const imageLayout = window.createImageLayout({ textarea: els.fBody, preview: els.preview, baseurl: () => state.config.baseurl });
  const updatePreview = debounce(() => {
    if (els.editorArea.classList.contains('edit')) return;
    els.preview.innerHTML = renderMarkdown(els.fBody.value, els.fLineBreaks.checked);
    linksInNewWindow(els.preview);
    imageLayout.afterRender();
  }, 120);
  els.editPane.addEventListener('input', () => { state.dirty = true; els.saveState.textContent = '저장 안 됨'; updatePreview(); });
  els.fLineBreaks.addEventListener('change', updatePreview);

  document.querySelectorAll('.seg-btn').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    els.editorArea.className = `editor-area ${btn.dataset.mode}`;
    try { localStorage.setItem('post-editor-mode', btn.dataset.mode); } catch (_) { /* 무시 */ }
    updatePreview();
  }));
  try {
    const mode = localStorage.getItem('post-editor-mode');
    if (mode) document.querySelector(`.seg-btn[data-mode="${mode}"]`)?.click();
  } catch (_) { /* 기본값 */ }

  // 편집창을 스크롤하면 미리보기도 비슷한 위치로 따라간다.
  els.fBody.addEventListener('scroll', () => {
    if (imageLayout.busy()) return;
    const ta = els.fBody;
    const ratio = ta.scrollTop / Math.max(1, ta.scrollHeight - ta.clientHeight);
    els.preview.scrollTop = ratio * (els.preview.scrollHeight - els.preview.clientHeight);
  });

  els.firstImageBtn.addEventListener('click', () => {
    const m = els.fBody.value.match(/!\[[^\]]*\]\(\s*<?([^)\s>]+\.(?:png|jpe?g|gif|webp|svg))/i)
      || els.fBody.value.match(/<img[^>]+src=["']([^"']+)/i)
      || els.fBody.value.match(/include\s+figure\.html\s+image="([^"]+)"/);
    if (!m) return toast('본문에 이미지가 없습니다.');
    els.fFeature.value = m[1];
    state.dirty = true;
  });

  // ---------- 서식 도구 ----------
  const ta = els.fBody;
  function changed() { ta.dispatchEvent(new Event('input', { bubbles: true })); }
  function wrapSelection(before, after = before) {
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e);
    ta.value = value.slice(0, s) + before + sel + after + value.slice(e);
    ta.focus();
    ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    changed();
  }
  function currentLineRange() {
    const { selectionStart, selectionEnd, value } = ta;
    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    let lineEnd = value.indexOf('\n', Math.max(selectionStart, selectionEnd - 1));
    if (lineEnd === -1) lineEnd = value.length;
    return { lineStart, lineEnd, selectionStart, selectionEnd, value };
  }
  function replaceLine(transform) {
    const { lineStart, lineEnd, selectionStart, selectionEnd, value } = currentLineRange();
    const line = value.slice(lineStart, lineEnd);
    const next = transform(line);
    const delta = next.length - line.length;
    ta.value = value.slice(0, lineStart) + next + value.slice(lineEnd);
    ta.focus();
    ta.setSelectionRange(Math.max(lineStart, selectionStart + delta), Math.max(lineStart, selectionEnd + delta));
    changed();
  }
  function setHeading(level) {
    replaceLine((line) => {
      const ex = line.match(/^(#{1,6})\s+/);
      const stripped = ex ? line.slice(ex[0].length) : line;
      return ex && ex[1].length === level ? stripped : `${'#'.repeat(level)} ${stripped}`;
    });
  }
  function toggleQuote() {
    replaceLine((line) => line.split('\n').map((l) => (/^>\s?/.test(l) ? l.replace(/^>\s?/, '') : `> ${l}`)).join('\n'));
  }
  function insertLink() {
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const label = value.slice(s, e) || '링크텍스트';
    ta.value = `${value.slice(0, s)}[${label}](url)${value.slice(e)}`;
    ta.focus();
    const u = s + label.length + 3;
    ta.setSelectionRange(u, u + 3);
    changed();
  }
  function insertCodeBlock() {
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e);
    const before = s > 0 && value[s - 1] !== '\n' ? '\n' : '';
    const block = `${before}\`\`\`java\n${sel}\n\`\`\`\n`;
    ta.value = value.slice(0, s) + block + value.slice(e);
    ta.focus();
    const langStart = s + before.length + 3;
    ta.setSelectionRange(langStart, langStart + 4);
    changed();
  }
  function toggleList(kind) {
    let num = 1;
    replaceLine((block) => block.split('\n').map((line) => {
      if (!line.trim()) return line;
      const indent = line.match(/^\s*/)[0];
      const stripped = line.replace(/^(\s*)([-*]|\d+[.)])\s+/, '$1').slice(indent.length);
      return kind === 'ul' ? `${indent}- ${stripped}` : `${indent}${num++}. ${stripped}`;
    }).join('\n'));
  }

  els.editToolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tb-btn');
    if (!btn) return;
    ({
      bold: () => wrapSelection('**'), italic: () => wrapSelection('*'), strike: () => wrapSelection('~~'),
      h1: () => setHeading(1), h2: () => setHeading(2), h3: () => setHeading(3),
      quote: toggleQuote, code: () => wrapSelection('`'), codeblock: insertCodeBlock, link: insertLink,
      image: () => els.mediaInput.click(), page: openPageDialog, ul: () => toggleList('ul'), ol: () => toggleList('ol'),
    })[btn.dataset.action]?.();
  });

  // 번호 목록: 같은 들여쓰기의 연속된 항목을 첫 번호부터 다시 매긴다.
  function renumberOrderedLists(text, cursorPos) {
    const oldLines = text.split('\n');
    const newLines = oldLines.slice();
    const lineDelta = new Array(oldLines.length).fill(0);
    const oldMarkerLen = new Array(oldLines.length).fill(0);
    const stack = [];
    let fence = false;
    for (let i = 0; i < oldLines.length; i++) {
      const line = oldLines[i];
      if (/^\s{0,3}(```|~~~)/.test(line)) { fence = !fence; stack.length = 0; continue; }
      if (fence) continue;
      if (line.trim() === '') { stack.length = 0; continue; }
      const m = line.match(/^(\s*)(\d+)([.)])(\s+)(.*)$/);
      const indent = (line.match(/^\s*/) || [''])[0].length;
      while (stack.length && stack[stack.length - 1].indent > indent) stack.pop();
      if (!m) continue;
      const top = stack[stack.length - 1];
      if (top && top.indent === indent) {
        const marker = `${m[1]}${top.next++}${m[3]}${m[4]}`;
        const oldLen = m[1].length + m[2].length + 1 + m[4].length;
        newLines[i] = marker + m[5];
        lineDelta[i] = marker.length - oldLen;
        oldMarkerLen[i] = oldLen;
      } else {
        stack.push({ indent, next: parseInt(m[2], 10) + 1 });
      }
    }
    const newText = newLines.join('\n');
    let remaining = cursorPos;
    let idx = 0;
    for (; idx < oldLines.length; idx++) {
      if (remaining <= oldLines[idx].length) break;
      remaining -= oldLines[idx].length + 1;
    }
    const delta = lineDelta[idx] || 0;
    const col = delta ? (remaining >= oldMarkerLen[idx] ? remaining + delta : Math.min(remaining, oldMarkerLen[idx] + delta)) : remaining;
    let cursor = 0;
    for (let i = 0; i < idx; i++) cursor += newLines[i].length + 1;
    return { text: newText, cursor: cursor + Math.max(0, col) };
  }
  ta.addEventListener('input', (e) => {
    if (e.isComposing) return; // 한글 조합 중에는 건드리지 않는다
    const r = renumberOrderedLists(ta.value, ta.selectionStart);
    if (r.text !== ta.value) { ta.value = r.text; ta.setSelectionRange(r.cursor, r.cursor); }
  });

  function handleTab(outdent) {
    const { lineStart, lineEnd, selectionStart, selectionEnd, value } = currentLineRange();
    if (!outdent && selectionStart === selectionEnd && !/^\s*([-*]|\d+[.)])\s/.test(value.slice(lineStart, lineEnd))) {
      ta.setRangeText('  ', selectionStart, selectionEnd, 'end');
      changed();
      return;
    }
    let first = 0;
    let total = 0;
    const lines = value.slice(lineStart, lineEnd).split('\n').map((line, i) => {
      const remove = outdent ? Math.min(2, (line.match(/^ */) || [''])[0].length) : -2;
      const next = outdent ? line.slice(remove) : `  ${line}`;
      const d = next.length - line.length;
      if (i === 0) first = d;
      total += d;
      return next;
    });
    ta.value = value.slice(0, lineStart) + lines.join('\n') + value.slice(lineEnd);
    ta.setSelectionRange(Math.max(lineStart, selectionStart + first), Math.max(lineStart, selectionEnd + total));
    changed();
  }
  function handleEnterList() {
    const { selectionStart: s, selectionEnd: e, value } = ta;
    if (s !== e) return false;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    let lineEnd = value.indexOf('\n', s);
    if (lineEnd === -1) lineEnd = value.length;
    const line = value.slice(lineStart, lineEnd);
    const ul = line.match(/^(\s*)([-*])(\s+)(\[[ x]\]\s+)?(.*)$/);
    const ol = line.match(/^(\s*)(\d+)([.)])(\s+)(.*)$/);
    if ((ul && !ul[5].trim()) || (ol && !ol[5].trim())) {
      ta.value = value.slice(0, lineStart) + value.slice(lineEnd);
      ta.setSelectionRange(lineStart, lineStart);
    } else if (ul) {
      ta.setRangeText(`\n${ul[1]}${ul[2]} ${ul[4] ? '[ ] ' : ''}`, s, s, 'end');
    } else if (ol) {
      ta.setRangeText(`\n${ol[1]}${parseInt(ol[2], 10) + 1}${ol[3]} `, s, s, 'end');
    } else {
      return false;
    }
    changed();
    return true;
  }
  ta.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && !e.shiftKey && k === 'b') { e.preventDefault(); wrapSelection('**'); return; }
    if (mod && !e.shiftKey && k === 'i') { e.preventDefault(); wrapSelection('*'); return; }
    if (mod && e.shiftKey && k === 's') { e.preventDefault(); wrapSelection('~~'); return; }
    if (mod && !e.shiftKey && k === 'k') { e.preventDefault(); insertLink(); return; }
    if (e.key === 'Tab') { e.preventDefault(); handleTab(e.shiftKey); return; }
    if (e.key === 'Enter' && !e.shiftKey && !mod) { if (handleEnterList()) e.preventDefault(); }
  });
  // Ctrl+S: 어디서든 편집 중이면 저장
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's' && !els.editPane.hidden) {
      e.preventDefault();
      els.editPane.requestSubmit();
    }
  });

  // ---------- 이미지·영상 넣기 ----------
  let uploadSeq = 0;
  const MEDIA_RE = /^(image\/(png|jpeg|gif|webp|svg\+xml)|video\/(mp4|webm))$/;
  async function insertMedia(files) {
    const list = [...files].filter((f) => MEDIA_RE.test(f.type));
    if (!list.length) { if (files.length) toast('PNG·JPG·GIF·WEBP·SVG 이미지나 MP4·WEBM 영상만 넣을 수 있습니다.', 'error'); return; }
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const jobs = list.map((file) => ({ file, mark: `![업로드 중… #${++uploadSeq}]()` }));
    const before = s > 0 && value[s - 1] !== '\n' ? '\n' : '';
    const after = value[e] === '\n' ? '' : '\n';
    const block = before + jobs.map((j) => j.mark).join('\n') + after;
    ta.value = value.slice(0, s) + block + value.slice(e);
    ta.setSelectionRange(s + block.length, s + block.length);
    changed();

    let id;
    try { id = await ensureDraftId(); } catch (err) { toast(err.message, 'error'); return; }
    for (const { file, mark } of jobs) {
      let replacement = '';
      try {
        const data = await api(`/api/drafts/${id}/media`, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
        const alt = (file.name || '').replace(/\.[^.]+$/, '').replace(/^image$/, '').replace(/[[\]]/g, '');
        replacement = `![${alt}](${data.url})`;
        if (data.warning) toast(data.warning);
      } catch (err) {
        toast(`업로드 실패: ${err.message}`, 'error');
      }
      const idx = ta.value.indexOf(mark);
      if (idx === -1) continue;
      const caret = ta.selectionStart;
      ta.value = ta.value.slice(0, idx) + replacement + ta.value.slice(idx + mark.length);
      const shift = caret > idx ? replacement.length - mark.length : 0;
      ta.setSelectionRange(caret + shift, caret + shift);
      changed();
    }
    // 이미지 링크가 들어간 상태를 바로 저장해 둔다(초안 파일과 이미지가 어긋나지 않게).
    try { await save({ quiet: true }); } catch (_) { /* 다음 저장 때 반영 */ }
  }
  els.mediaInput.addEventListener('change', () => { insertMedia(els.mediaInput.files); els.mediaInput.value = ''; });
  ta.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files || [])];
    if (files.some((f) => MEDIA_RE.test(f.type))) { e.preventDefault(); insertMedia(files); }
  });
  ta.addEventListener('drop', (e) => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    insertMedia(e.dataTransfer.files);
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  // ---------- HTML 페이지 올리기 ----------
  const page = {
    dialog: $('#pageDialog'), source: $('#pageSource'), browse: $('#pageBrowse'), name: $('#pageName'),
    linkText: $('#pageLinkText'), whole: $('#pageWhole'), result: $('#pageResult'), importBtn: $('#pageImportBtn'),
    list: $('#pageList'), count: $('#pageCount'),
  };
  let pageCaret = null;
  const native = window.postEditorNative; // 트레이 앱에서만 있음(파일 선택 창, 끌어다 놓은 파일의 경로)

  function insertAtCaret(text) {
    const pos = Math.min(pageCaret ?? ta.value.length, ta.value.length);
    ta.value = ta.value.slice(0, pos) + text + ta.value.slice(pos);
    const caret = pos + text.length;
    ta.setSelectionRange(caret, caret);
    pageCaret = caret;
    changed();
  }
  const mdLink = (text, url) => `[${String(text).replace(/[[\]]/g, '')}](${url})`;

  async function loadPageList() {
    try {
      const pages = await api('/api/pages');
      page.count.textContent = pages.length;
      page.list.innerHTML = pages.map((p, i) => `<li><button type="button" class="link-btn" data-i="${i}">${escapeHtml(p.title || p.folder)}</button>
        <span class="dim">pages/${escapeHtml(p.folder)}/${escapeHtml(p.entry)}</span>
        <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener">열기</a></li>`).join('') || '<li class="dim">아직 없습니다.</li>';
      page.list.querySelectorAll('.link-btn').forEach((b) => b.addEventListener('click', () => {
        const p = pages[Number(b.dataset.i)];
        insertAtCaret(mdLink(page.linkText.value.trim() || p.title || p.folder, p.url));
        toast('링크를 넣었습니다.');
      }));
    } catch (err) { page.list.innerHTML = `<li class="dim">${escapeHtml(err.message)}</li>`; }
  }

  function openPageDialog() {
    pageCaret = ta.selectionStart;
    page.result.hidden = true;
    page.result.className = 'upload-log';
    page.browse.hidden = !native;
    loadPageList();
    page.dialog.showModal();
    page.source.focus();
  }

  page.browse.addEventListener('click', async () => {
    const picked = await native.pickHtml();
    if (picked) page.source.value = picked;
  });
  // 트레이 앱에서는 HTML 파일을 대화상자에 끌어다 놓으면 경로가 들어간다.
  page.dialog.addEventListener('dragover', (e) => e.preventDefault());
  page.dialog.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const p = native?.pathForFile(file);
    if (p) page.source.value = p;
    else toast('브라우저에서는 파일 경로를 알 수 없어요. 경로를 붙여넣어 주세요.');
  });

  page.importBtn.addEventListener('click', async () => {
    page.importBtn.disabled = true;
    page.importBtn.textContent = '복사하는 중…';
    page.result.hidden = false;
    page.result.className = 'upload-log';
    page.result.textContent = 'HTML과 참조 파일을 찾는 중…';
    try {
      const r = await api('/api/pages/import', jsonOpts('POST', {
        source: page.source.value, name: page.name.value.trim(), wholeFolder: page.whole.checked,
      }));
      insertAtCaret(mdLink(page.linkText.value.trim() || r.title || r.folder, r.url));
      const lines = [
        `${r.updated ? '갱신' : '복사'} 완료 → ${r.path}  (파일 ${r.files.length}개, ${(r.bytes / 1048576).toFixed(1)}MB)`,
        `글에 링크를 넣었습니다: ${r.url}`,
      ];
      if (r.rewritten.length) lines.push(`복사본에서 링크를 고친 파일: ${r.rewritten.join(', ')}`);
      if (r.missing.length) lines.push(`찾지 못한 파일(그대로 둠): ${r.missing.join(', ')}`);
      r.warnings.forEach((w) => lines.push(`참고: ${w}`));
      page.result.textContent = lines.join('\n');
      page.result.classList.add(r.missing.length ? 'error' : 'ok');
      loadPageList();
      refreshPending();
    } catch (err) {
      page.result.textContent = err.message;
      page.result.classList.add('error');
    }
    page.importBtn.disabled = false;
    page.importBtn.textContent = '가져와서 링크 넣기';
  });

  // ---------- 업로드 ----------
  const CODE_LABEL = { M: '수정', A: '추가', D: '삭제', R: '이름 변경', '??': '새 파일', '?': '새 파일' };
  els.uploadBtn.addEventListener('click', async () => {
    const st = await refreshPending();
    if (!st) return toast('git 상태를 읽지 못했습니다.', 'error');
    els.uploadLog.hidden = true;
    els.uploadLog.textContent = '';
    els.changeList.innerHTML = st.changes.map((c) =>
      `<li><span class="badge ${c.code === 'D' ? 'del' : 'pending'}">${CODE_LABEL[c.code] || c.code}</span> ${escapeHtml(c.path)}</li>`).join('')
      || '<li class="dim">커밋할 변경 사항이 없습니다.</li>';
    const info = [`브랜치 <b>${escapeHtml(st.branch)}</b> → origin`];
    if (st.ahead) info.push(`아직 push 안 된 커밋 ${st.ahead}개도 함께 올라갑니다.`);
    els.uploadInfo.innerHTML = info.join(' · ');
    const titles = st.changes.filter((c) => c.path.startsWith('_posts/') && c.code !== 'D')
      .map((c) => state.posts.find((p) => `_posts/${p.postFile}` === c.path)?.title).filter(Boolean);
    const folders = [...new Set(st.changes.filter((c) => c.path.startsWith('pages/')).map((c) => c.path.split('/')[1]))];
    els.commitMsg.value = [titles.length && `Post Uploading: ${titles.join(', ')}`, folders.length && `pages: ${folders.join(', ')}`].filter(Boolean).join(' / ');
    els.doUploadBtn.disabled = !st.changes.length && !st.ahead;
    els.uploadDialog.showModal();
  });
  els.doUploadBtn.addEventListener('click', async () => {
    els.doUploadBtn.disabled = true;
    els.doUploadBtn.textContent = '올리는 중…';
    els.uploadLog.hidden = false;
    els.uploadLog.className = 'upload-log';
    els.uploadLog.textContent = 'git commit & push 중…';
    try {
      const r = await api('/api/git/upload', jsonOpts('POST', { message: els.commitMsg.value }));
      els.uploadLog.textContent = `완료! 몇 분 뒤 블로그에 반영됩니다.\n\n${r.log}`;
      els.uploadLog.classList.add('ok');
      toast('업로드했습니다.');
    } catch (err) {
      els.uploadLog.textContent = err.message;
      els.uploadLog.classList.add('error');
      els.doUploadBtn.disabled = false;
    }
    els.doUploadBtn.textContent = '커밋하고 올리기';
    loadLists();
  });

  // ---------- 시작 ----------
  (async () => {
    try { state.config = await api('/api/config'); } catch (_) { /* 기본값 */ }
    await loadLists();
  })();
})();
