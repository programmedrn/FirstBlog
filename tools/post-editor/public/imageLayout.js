/*
 * 미리보기에서 그림 크기·정렬·한 줄 배치를 직접 조정한다.
 * - 그림 클릭 → 테두리·손잡이·도구 막대가 뜬다. 손잡이를 끌면 크기(본문 폭 대비 %)가 바뀐다.
 * - 그림을 다른 그림의 왼쪽/오른쪽 절반에 끌어다 놓으면 한 줄(<div class="img-row">)로 묶인다.
 * 결과는 본문에 HTML <img>로 저장되고, 바꾼 내용은 Ctrl+Z로 되돌릴 수 있다.
 */
window.createImageLayout = ({ textarea: ta, preview, baseurl }) => {
  const ALIGNS = ['left', 'center', 'right'];
  const ALIGN_LABEL = { left: '⇤ 왼쪽', center: '↔ 가운데', right: '⇥ 오른쪽' };
  const PRESETS = [25, 33, 50, 75, 100];
  const SNAPS = [25, 33, 50, 66, 75, 100];
  const VIDEO_RE = /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i;
  const IMG_RE = /<img\b[^>]*>|!\[([^\]\n]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"\n]*")?\s*\)/g;
  const ROW_RE = /<div class="img-row">[\s\S]*?<\/div>/g;

  let items = [];          // 본문 속 그림(문서 순서)
  let sel = null;          // 선택된 그림 { idx, src }
  let dragIdx = null;
  let busyUntil = 0;       // 본문을 고친 직후엔 스크롤 동기화를 잠시 멈춘다
  let keepScroll = null;

  // ---------- 본문 읽기 ----------
  // 코드 블록·인라인 코드 안의 그림 문법은 그림이 아니므로 같은 길이의 공백으로 가린다.
  function maskCode(text) {
    let fence = null;
    return text.split('\n').map((line) => {
      const m = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (fence) {
        if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
        return ' '.repeat(line.length);
      }
      if (m) { fence = m[1]; return ' '.repeat(line.length); }
      return line.replace(/(`+)[^`]*?\1/g, (s) => ' '.repeat(s.length));
    }).join('\n');
  }

  const tpl = document.createElement('template');
  function makeItem(text, start, end, md) {
    let el;
    if (md) {
      el = document.createElement('img');
      el.setAttribute('src', md.src);
      el.setAttribute('alt', md.alt);
    } else {
      tpl.innerHTML = text.slice(start, end);
      el = tpl.content.querySelector('img');
      if (!el) return null;
    }
    const src = el.getAttribute('src') || '';
    if (!src || VIDEO_RE.test(src)) return null;
    const w = el.style.width;
    return {
      start, end, el, src, md: !!md, row: null,
      width: /%$/.test(w) ? parseFloat(w) : null,
      align: ALIGNS.find((a) => el.classList.contains(`img-${a}`)) || null,
    };
  }

  function scan(text) {
    const masked = maskCode(text);
    const rows = [...masked.matchAll(ROW_RE)].map((m) => ({ start: m.index, end: m.index + m[0].length, items: [] }));
    const out = [];
    for (const m of masked.matchAll(IMG_RE)) {
      const start = m.index;
      const end = start + m[0].length;
      const isMd = m[0][0] === '!';
      const item = makeItem(text, start, end, isMd ? { alt: m[1], src: m[2] } : null);
      if (!item) continue;
      const row = rows.find((r) => start >= r.start && end <= r.end);
      if (row && !isMd) { item.row = row; row.items.push(item); }
      out.push(item);
    }
    return out;
  }

  // ---------- 본문 쓰기 ----------
  function imgHtml(item, { width = item.width, align = item.align, inRow = false } = {}) {
    const el = item.el.cloneNode();
    ALIGNS.forEach((a) => el.classList.remove(`img-${a}`));
    if (!inRow && align) el.classList.add(`img-${align}`);
    if (!el.classList.length) el.removeAttribute('class');
    el.style.width = width != null ? `${width}%` : '';
    if (!el.getAttribute('style')) el.removeAttribute('style');
    const plain = [...el.attributes].every((a) => a.name === 'src' || a.name === 'alt');
    if (!inRow && plain) return `![${(el.getAttribute('alt') || '').replace(/[[\]]/g, '')}](${item.src})`;
    if (!el.hasAttribute('alt')) el.setAttribute('alt', '');
    return el.outerHTML;
  }
  const rowHtml = (list) =>
    `<div class="img-row">\n${list.map(({ item, width }) => imgHtml(item, { width, inRow: true })).join('\n')}\n</div>`;

  // 앞뒤에 빈 줄을 두어 블록(HTML div)으로 읽히게 한다.
  function blockEdit(text, start, end, block) {
    const before = text.slice(0, start).replace(/[ \t]+$/, '');
    const after = text.slice(end).replace(/^[ \t]+/, '');
    const pre = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const post = !after || /^\n[ \t]*\n/.test(after) ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    return { start: before.length, end: text.length - after.length, text: pre + block + post };
  }

  // 그림을 빼낸다. 그 줄이 비면 줄째 지우고, 빈 줄이 겹치면 하나만 남긴다.
  function removal(text, start, end) {
    const ls = text.lastIndexOf('\n', start - 1) + 1;
    let le = text.indexOf('\n', end);
    if (le === -1) le = text.length;
    if (text.slice(ls, start).trim() || text.slice(end, le).trim()) return { start, end, text: '' };
    start = ls;
    end = Math.min(le + 1, text.length);
    const blankBefore = start === 0 || /\n[ \t]*\n$/.test(text.slice(0, start)) || /^[ \t]*\n$/.test(text.slice(0, start));
    const next = text.slice(end).match(/^[ \t]*\n/);
    if (blankBefore && next) end += next[0].length;
    return { start, end, text: '' };
  }

  // 줄에서 그림 하나를 빼고 남은 것을 다시 쓴다(하나만 남으면 줄을 푼다).
  function leaveRow(A) {
    const rest = A.row.items.filter((x) => x !== A);
    const text = rest.length >= 2
      ? rowHtml(rest.map((it) => ({ item: it, width: it.width })))
      : imgHtml(rest[0], { width: rest[0].width, align: 'center' });
    return { start: A.row.start, end: A.row.end, text };
  }

  function applyEdits(text, edits) {
    return edits.sort((a, b) => b.start - a.start)
      .reduce((t, e) => t.slice(0, e.start) + e.text + t.slice(e.end), text)
      // 그림 줄을 옮기며 생긴 겹친 빈 줄은 하나로
      .replace(/(<div class="img-row">[^]*?<\/div>|^<img\b[^>\n]*>)\n{3,}/gm, '$1\n\n')
      .replace(/\n{3,}(<div class="img-row">)/g, '\n\n$1');
  }

  // 바뀐 부분만 execCommand로 넣어 Ctrl+Z 한 번에 되돌릴 수 있게 한다.
  function applyText(next) {
    const prev = ta.value;
    if (prev === next) return;
    let a = 0;
    while (a < prev.length && a < next.length && prev[a] === next[a]) a++;
    let b = 0;
    while (b < prev.length - a && b < next.length - a && prev[prev.length - 1 - b] === next[next.length - 1 - b]) b++;
    busyUntil = performance.now() + 600;
    keepScroll = preview.scrollTop;
    const taScroll = ta.scrollTop;
    let ok = false;
    if (ta.offsetParent !== null) {
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(a, prev.length - b);
      const insert = next.slice(a, next.length - b);
      try { ok = insert ? document.execCommand('insertText', false, insert) : document.execCommand('delete'); } catch (_) { ok = false; }
      ta.scrollTop = taScroll;
    }
    if (!ok || ta.value !== next) {
      ta.value = next;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // 편집 직전에 본문을 다시 읽어, 화면에서 고른 그림이 그대로인지 확인한다.
  function fresh(...idxs) {
    const text = ta.value;
    const its = scan(text);
    const ok = idxs.every((i) => its[i] && items[i] && its[i].src === items[i].src);
    return ok ? { text, its } : null;
  }

  // ---------- 동작 ----------
  function update(idx, opts) {
    const f = fresh(idx);
    if (!f) return;
    const A = f.its[idx];
    applyText(applyEdits(f.text, [{ start: A.start, end: A.end, text: imgHtml(A, { ...opts, inRow: !!A.row }) }]));
  }

  function join(aIdx, bIdx, side) {
    const f = fresh(aIdx, bIdx);
    if (!f) return;
    const { text, its } = f;
    const A = its[aIdx];
    const B = its[bIdx];
    const edits = [];
    if (A.row && A.row === B.row) {
      const list = A.row.items.filter((x) => x !== A);
      list.splice(list.indexOf(B) + (side === 'after' ? 1 : 0), 0, A);
      edits.push({ start: A.row.start, end: A.row.end, text: rowHtml(list.map((it) => ({ item: it, width: it.width }))) });
    } else {
      const list = B.row ? B.row.items.slice() : [B];
      list.splice(list.indexOf(B) + (side === 'after' ? 1 : 0), 0, A);
      const share = Math.floor(100 / list.length);
      const html = rowHtml(list.map((it) => ({ item: it, width: share })));
      edits.push(B.row ? { start: B.row.start, end: B.row.end, text: html } : blockEdit(text, B.start, B.end, html));
      edits.push(A.row ? leaveRow(A) : removal(text, A.start, A.end));
    }
    sel = { src: A.src };
    applyText(applyEdits(text, edits));
  }

  function detach(idx) {
    const f = fresh(idx);
    if (!f) return;
    const A = f.its[idx];
    const edit = leaveRow(A);
    edit.text += `\n\n${imgHtml(A, { width: A.width, align: 'center' })}`;
    applyText(applyEdits(f.text, [edit]));
  }

  function shift(idx, dir) {
    const f = fresh(idx);
    if (!f) return;
    const A = f.its[idx];
    const list = A.row.items.slice();
    const i = list.indexOf(A);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    applyText(applyEdits(f.text, [{ start: A.row.start, end: A.row.end, text: rowHtml(list.map((it) => ({ item: it, width: it.width }))) }]));
  }

  // 줄 안의 그림 높이가 같아지도록 폭을 그림 비율대로 나눈다(전체 폭은 유지).
  function evenHeights(idx) {
    const f = fresh(idx);
    if (!f) return;
    const row = f.its[idx].row;
    const ratio = row.items.map((it) => {
      const img = preview.querySelector(`img[data-il="${f.its.indexOf(it)}"]`);
      return img && img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
    });
    const total = Math.min(100, row.items.reduce((s, it) => s + (it.width ?? 100 / row.items.length), 0));
    const sum = ratio.reduce((s, r) => s + r, 0);
    const list = row.items.map((it, i) => ({ item: it, width: Math.round((total * ratio[i]) / sum * 10) / 10 }));
    applyText(applyEdits(f.text, [{ start: row.start, end: row.end, text: rowHtml(list) }]));
  }

  function remove(idx) {
    const f = fresh(idx);
    if (!f) return;
    const A = f.its[idx];
    sel = null;
    applyText(applyEdits(f.text, [A.row ? leaveRow(A) : removal(f.text, A.start, A.end)]));
  }

  // ---------- 화면 ----------
  const overlay = document.createElement('div');
  overlay.className = 'il-overlay';
  overlay.hidden = true;
  overlay.innerHTML = '<div class="il-frame"><span class="il-size"></span><span class="il-handle il-l" title="끌어서 크기 조절 (Alt: 1% 단위)"></span><span class="il-handle il-r" title="끌어서 크기 조절 (Alt: 1% 단위)"></span></div><div class="il-bar"></div>';
  const frame = overlay.querySelector('.il-frame');
  const sizeTag = overlay.querySelector('.il-size');
  const bar = overlay.querySelector('.il-bar');
  const marker = document.createElement('div');
  marker.className = 'il-marker';
  marker.hidden = true;

  const norm = (s) => {
    const v = String(s || '').replace(/\{\{-?\s*site\.baseurl\s*-?\}\}/g, baseurl()).trim();
    try { return decodeURI(v); } catch (_) { return v; }
  };
  const imgEl = (idx) => preview.querySelector(`img[data-il="${idx}"]`);

  function rectIn(el) {
    const r = el.getBoundingClientRect();
    const p = preview.getBoundingClientRect();
    return {
      left: r.left - p.left - preview.clientLeft + preview.scrollLeft,
      top: r.top - p.top - preview.clientTop + preview.scrollTop,
      width: r.width, height: r.height,
    };
  }
  const anchorOf = (item) => (item.row || !item.align || item.align === 'left' ? 'left' : item.align);

  function buildBar(item) {
    const b = (act, label, title = '', on = false) =>
      `<button type="button" data-act="${act}" title="${title}"${on ? ' class="on"' : ''}>${label}</button>`;
    const sep = '<span class="il-sep"></span>';
    const sizes = PRESETS.map((p) => b(`w:${p}`, `${p}%`, `폭 ${p}%`, item.width === p)).join('');
    let html;
    if (item.row) {
      html = b('left', '◀', '줄 안에서 왼쪽으로') + b('right', '▶', '줄 안에서 오른쪽으로') + sep + sizes + sep
        + b('even', '높이 맞추기', '줄 안 그림들의 높이가 같아지게 폭을 나눕니다') + b('detach', '줄에서 빼기')
        + b('remove', '🗑', '그림 지우기');
    } else {
      html = ALIGNS.map((a) => b(`a:${a}`, ALIGN_LABEL[a], '', (item.align || null) === a)).join('') + sep + sizes + sep
        + b('reset', '원래대로', '크기·정렬 지정을 없앱니다') + b('remove', '🗑', '그림 지우기');
    }
    bar.innerHTML = `${html}<span class="il-hint">다른 그림 옆으로 끌어 놓으면 한 줄로</span>`;
  }

  function reposition() {
    const img = sel && imgEl(sel.idx);
    if (!img) { overlay.hidden = true; return; }
    const item = items[sel.idx];
    const r = rectIn(img);
    Object.assign(frame.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    const anchor = anchorOf(item);
    frame.querySelector('.il-l').hidden = anchor === 'left';
    frame.querySelector('.il-r').hidden = anchor === 'right';
    if (!dragging) sizeTag.textContent = item.width != null ? `${item.width}%` : '원래 크기';
    overlay.hidden = false;
    const bh = bar.offsetHeight;
    const bw = bar.offsetWidth;
    let top = r.top - bh - 8;
    if (top < preview.scrollTop + 4) top = Math.min(preview.scrollTop + 4, r.top + r.height - bh);
    const left = Math.max(4, Math.min(r.left, overlay.clientWidth - bw - 4));
    Object.assign(bar.style, { top: `${Math.max(0, top)}px`, left: `${left}px` });
  }

  function select(idx) {
    if (!items[idx] || !imgEl(idx)) return deselect();
    sel = { idx, src: items[idx].src };
    buildBar(items[idx]);
    reposition();
  }
  function deselect() { sel = null; overlay.hidden = true; }

  // 미리보기를 새로 그린 뒤 부른다: 그림마다 본문 위치를 붙이고 선택을 되살린다.
  function afterRender() {
    items = scan(ta.value);
    let j = 0;
    for (const img of preview.querySelectorAll('img')) {
      if (img.closest('pre, code')) continue;
      const key = norm(img.getAttribute('src'));
      let k = j;
      while (k < items.length && norm(items[k].src) !== key) k++;
      if (k >= items.length) continue;
      img.dataset.il = k;
      img.draggable = !img.closest('a');
      j = k + 1;
    }
    preview.append(overlay, marker);
    if (keepScroll != null) { preview.scrollTop = keepScroll; keepScroll = null; }
    if (sel) {
      const near = sel.idx ?? 0;
      const cands = items.map((it, i) => i).filter((i) => items[i].src === sel.src && imgEl(i));
      if (cands.length) select(cands.reduce((a, c) => (Math.abs(c - near) < Math.abs(a - near) ? c : a)));
      else deselect();
    }
  }

  // ---------- 이벤트 ----------
  preview.addEventListener('click', (e) => {
    if (e.target.closest('.il-overlay')) return;
    const img = e.target.closest('img[data-il]');
    if (img) { e.preventDefault(); select(+img.dataset.il); } else deselect();
  });
  preview.addEventListener('load', (e) => { if (e.target.tagName === 'IMG' && sel) reposition(); }, true);
  preview.addEventListener('scroll', () => { if (sel) reposition(); });
  window.addEventListener('resize', () => { if (sel) reposition(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sel && !document.querySelector('dialog[open]')) deselect(); });

  bar.addEventListener('mousedown', (e) => e.preventDefault());
  bar.addEventListener('click', (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act || !sel) return;
    const { idx } = sel;
    if (act.startsWith('w:')) update(idx, { width: +act.slice(2) });
    else if (act.startsWith('a:')) {
      update(idx, { align: act.slice(2) });
    } else if (act === 'reset') update(idx, { width: null, align: null });
    else if (act === 'left' || act === 'right') shift(idx, act === 'left' ? -1 : 1);
    else if (act === 'even') evenHeights(idx);
    else if (act === 'detach') detach(idx);
    else if (act === 'remove') remove(idx);
  });

  // 손잡이로 크기 조절: 끄는 동안은 화면만 바꾸고, 놓을 때 본문에 쓴다.
  let dragging = null;
  frame.querySelectorAll('.il-handle').forEach((h) => {
    h.addEventListener('pointerdown', (e) => {
      if (!sel) return;
      const img = imgEl(sel.idx);
      if (!img) return;
      e.preventDefault();
      e.stopPropagation();
      h.setPointerCapture(e.pointerId);
      const parent = img.parentElement;
      const cs = getComputedStyle(parent);
      const cw = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const r = img.getBoundingClientRect();
      dragging = { idx: sel.idx, img, cw, r, anchor: anchorOf(items[sel.idx]), pct: null };
    });
    h.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const { r, cw, anchor, img } = dragging;
      const px = anchor === 'left' ? e.clientX - r.left
        : anchor === 'right' ? r.right - e.clientX
          : 2 * Math.abs(e.clientX - (r.left + r.width / 2));
      let pct = Math.max(5, Math.min(100, (px / cw) * 100));
      const snap = SNAPS.find((s) => Math.abs(s - pct) < 1.5);
      pct = !e.altKey && snap ? snap : Math.round(pct);
      dragging.pct = pct;
      img.style.width = `${pct}%`;
      sizeTag.textContent = `${pct}%`;
      reposition();
    });
    const finish = () => {
      if (!dragging) return;
      const { idx, pct } = dragging;
      dragging = null;
      if (pct != null && pct !== items[idx]?.width) update(idx, { width: pct });
      else reposition();
    };
    h.addEventListener('pointerup', finish);
    h.addEventListener('pointercancel', finish);
  });

  // 그림을 다른 그림 옆으로 끌어다 놓으면 한 줄로 묶는다.
  preview.addEventListener('dragstart', (e) => {
    const img = e.target.closest?.('img[data-il]');
    if (!img || !img.draggable) return;
    dragIdx = +img.dataset.il;
    e.dataTransfer.clearData();
    e.dataTransfer.setData('application/x-post-image', String(dragIdx));
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setDragImage(img, e.offsetX, e.offsetY); } catch (_) { /* 기본 모양 */ }
    requestAnimationFrame(() => { overlay.hidden = true; });
  });
  function dropTarget(e) {
    const img = e.target.closest?.('img[data-il]');
    if (!img || +img.dataset.il === dragIdx) return null;
    const r = img.getBoundingClientRect();
    return { img, idx: +img.dataset.il, side: e.clientX < r.left + r.width / 2 ? 'before' : 'after' };
  }
  preview.addEventListener('dragover', (e) => {
    if (dragIdx == null) return;
    const t = dropTarget(e);
    if (!t) { marker.hidden = true; return; }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const r = rectIn(t.img);
    Object.assign(marker.style, {
      left: `${(t.side === 'before' ? r.left - 6 : r.left + r.width + 2)}px`, top: `${r.top}px`, height: `${r.height}px`,
    });
    marker.hidden = false;
  });
  preview.addEventListener('drop', (e) => {
    if (dragIdx == null) return;
    e.preventDefault();
    e.stopPropagation();
    const t = dropTarget(e);
    const from = dragIdx;
    dragIdx = null;
    marker.hidden = true;
    if (t) join(from, t.idx, t.side);
  });
  preview.addEventListener('dragend', () => {
    dragIdx = null;
    marker.hidden = true;
    if (sel) reposition();
  });

  return {
    afterRender,
    busy: () => performance.now() < busyUntil || dragging != null,
    _scan: scan,
  };
};
