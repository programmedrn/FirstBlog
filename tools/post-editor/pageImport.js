// 로컬 HTML 하나를 가져와 저장소의 pages/<이름>/ 아래로 복사한다.
// HTML이 쓰는 이미지·영상·CSS·JS 등 로컬 파일을 찾아 같은 상대 위치로 함께 복사하므로,
// 복사된 폴더는 로컬에서 그대로 열어도 되고 GitHub Pages에서도 같은 상대 경로로 열린다.
// 원본 파일은 고치지 않는다. 링크를 바꿔야 하는 경우(HTML 폴더 밖의 파일, 절대 경로,
// Jekyll이 무시하는 _ . 로 시작하는 이름)에만 복사본의 링크를 바꾼다.
'use strict';

const fs = require('fs');
const path = require('path');

const MAX_FILE = 95 * 1024 * 1024;   // GitHub는 100MB 넘는 파일을 거부한다
const BIG_FILE = 10 * 1024 * 1024;
const MAX_FILES = 2000;
const MAX_PAGES = 50;                // 같은 폴더 안에서 링크로 이어진 HTML도 함께 가져오되 이만큼까지
const SKIP_DIRS = new Set(['node_modules', '.git', '.svn', '__pycache__']);
const HTML_EXT = new Set(['.html', '.htm', '.xhtml']);
const REMOTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\{\{|\{%)/i; // http:, data:, mailto:, //cdn, #anchor, 템플릿

// Windows 경로(D:\a\b.html), WSL 네트워크 경로(\\wsl.localhost\배포판\home\..), file:// 주소를 WSL 경로로 바꾼다.
function toLocalPath(input) {
  let p = String(input || '').trim().replace(/^["']|["']$/g, '');
  if (/^file:\/\//i.test(p)) {
    p = decodeURIComponent(p.replace(/^file:\/\/(localhost)?/i, ''));
    if (/^\/[A-Za-z]:\//.test(p)) p = p.slice(1);
  }
  let m = p.match(/^\\\\wsl(?:\.localhost|\$)\\[^\\]+(\\.*)$/i);
  if (m) return m[1].replace(/\\/g, '/');
  m = p.match(/^([A-Za-z]):[\\/](.*)$/);
  if (m) return `/mnt/${m[1].toLowerCase()}/${m[2].replace(/\\/g, '/')}`;
  return p;
}

function decodeText(buf) {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(buf), encoding: 'utf8' };
  } catch (_) {
    // UTF-8이 아니면(EUC-KR 등) 바이트를 그대로 보존하는 latin1로 다룬다.
    return { text: buf.toString('latin1'), encoding: 'latin1' };
  }
}

function splitRef(ref) {
  const m = ref.match(/^([^?#]*)(.*)$/);
  let file = m[1];
  try { file = decodeURIComponent(file); } catch (_) { /* %가 그냥 문자인 경우 */ }
  return { file, suffix: m[2] };
}

// 문서 안에서 파일을 가리키는 자리들을 모두 찾는다. 각 항목: { start, end, value }
function findRefsInHtml(text) {
  const refs = [];
  const tagRe = /<([a-zA-Z][\w-]*)\b([^>]*)>/g;
  let t;
  while ((t = tagRe.exec(text))) {
    const tag = t[1].toLowerCase();
    const attrsStart = t.index + 1 + t[1].length;
    const attrRe = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>"']+))/g;
    let a;
    while ((a = attrRe.exec(t[2]))) {
      const name = a[1].toLowerCase();
      const value = a[3] ?? a[4] ?? a[5] ?? '';
      const valueStart = attrsStart + a.index + a[0].length - a[2].length + (a[5] !== undefined ? 0 : 1);
      if (name === 'srcset' || (name === 'imagesrcset')) {
        // "a.png 1x, b.png 2x"
        const partRe = /(^|,)\s*([^\s,]+)/g;
        let s;
        while ((s = partRe.exec(value))) {
          const off = s.index + s[0].length - s[2].length;
          refs.push({ start: valueStart + off, end: valueStart + off + s[2].length, value: s[2] });
        }
      } else if (name === 'style') {
        for (const r of findRefsInCss(value)) refs.push({ ...r, start: valueStart + r.start, end: valueStart + r.end });
      } else if (['src', 'poster', 'data', 'background'].includes(name)
        || (name === 'href' && ['link', 'a', 'area', 'image', 'use'].includes(tag))
        || (name === 'xlink:href')) {
        refs.push({ start: valueStart, end: valueStart + value.length, value, tag, link: tag === 'a' || tag === 'area' });
      }
    }
  }
  // <style> 블록 안의 url(...), @import
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let st;
  while ((st = styleRe.exec(text))) {
    const base = st.index + st[0].indexOf(st[1], st[0].indexOf('>'));
    for (const r of findRefsInCss(st[1])) refs.push({ ...r, start: base + r.start, end: base + r.end });
  }
  return refs;
}

function findRefsInCss(text) {
  const refs = [];
  const re = /url\(\s*(["']?)([^"')]+)\1\s*\)|@import\s+(["'])([^"']+)\3/g;
  let m;
  while ((m = re.exec(text))) {
    const value = m[2] ?? m[4];
    const off = m.index + m[0].indexOf(value, m[2] !== undefined ? 4 : 7);
    refs.push({ start: off, end: off + value.length, value });
  }
  return refs;
}

// Jekyll은 _ . # 로 시작하거나 ~ 로 끝나는 파일·폴더를 사이트에 올리지 않으므로 이름을 바꾼다.
function safeSegments(rel) {
  return rel.split('/').filter((s) => s && s !== '.')
    .map((s) => (/^[_.#]/.test(s) ? `x${s}` : s))
    .map((s) => (s.endsWith('~') ? `${s.slice(0, -1)}-` : s))
    .join('/');
}

function walk(dir, out, root) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out, root);
    else if (ent.isFile()) out.push(path.relative(root, full).split(path.sep).join('/'));
    if (out.length > MAX_FILES) throw new Error(`파일이 ${MAX_FILES}개를 넘어 멈췄습니다. 폴더 전체 대신 참조 파일만 가져오세요.`);
  }
}

/**
 * @param {object} opts
 * @param {string} opts.source  로컬 HTML 경로(Windows 경로 가능)
 * @param {string} opts.destDir 복사할 폴더(절대 경로, 없거나 비어 있어야 함 — 덮어쓰기면 먼저 비움)
 * @param {boolean} opts.wholeFolder HTML이 있는 폴더 전체를 복사할지
 */
function importPage({ source, destDir, wholeFolder = false }) {
  const entry = path.resolve(toLocalPath(source));
  if (!fs.existsSync(entry) || !fs.statSync(entry).isFile()) throw new Error(`파일을 찾을 수 없습니다: ${entry}`);
  if (!HTML_EXT.has(path.extname(entry).toLowerCase())) throw new Error('HTML 파일(.html, .htm)을 골라 주세요.');
  const root = path.dirname(entry);

  // rel(사이트 쪽 상대 경로) → 원본 절대 경로
  const plan = new Map();
  const missing = new Set();
  const warnings = [];
  const pending = [];
  const rewrites = new Map(); // 문서 rel → [{start,end,replacement}]
  let pages = 0;
  let externalCount = 0;
  const externalMap = new Map(); // 원본 절대 경로 → external/... rel

  function relFor(abs) {
    const r = path.relative(root, abs);
    if (!r.startsWith('..') && !path.isAbsolute(r)) return safeSegments(r.split(path.sep).join('/'));
    // HTML 폴더 밖의 파일은 external/ 아래로 모은다.
    if (!externalMap.has(abs)) {
      externalCount += 1;
      externalMap.set(abs, `external/${externalCount}-${safeSegments(path.basename(abs))}`);
    }
    return externalMap.get(abs);
  }

  function add(abs, rel) {
    if (plan.has(rel)) return;
    plan.set(rel, abs);
    const ext = path.extname(abs).toLowerCase();
    if (HTML_EXT.has(ext) || ext === '.css') pending.push(rel);
  }

  const entryRel = safeSegments(path.basename(entry));
  add(entry, entryRel);
  if (wholeFolder) {
    const all = [];
    walk(root, all, root);
    for (const rel of all) add(path.join(root, rel), safeSegments(rel));
  }

  while (pending.length) {
    const rel = pending.shift();
    const abs = plan.get(rel);
    const ext = path.extname(abs).toLowerCase();
    const isHtml = HTML_EXT.has(ext);
    if (isHtml && ++pages > MAX_PAGES) { warnings.push(`HTML이 ${MAX_PAGES}개를 넘어 나머지 링크는 따라가지 않았습니다.`); break; }
    const { text } = decodeText(fs.readFileSync(abs));
    const refs = isHtml ? findRefsInHtml(text) : findRefsInCss(text);
    const docDir = path.dirname(abs);
    const relDir = path.posix.dirname(rel);
    const edits = [];

    for (const ref of refs) {
      const raw = ref.value.trim();
      const isDrive = /^[A-Za-z]:[\\/]/.test(raw); // D:\a.png 는 주소가 아니라 파일 경로
      if (!raw || (REMOTE.test(raw) && !isDrive && !/^file:/i.test(raw))) continue;
      const { file, suffix } = splitRef(raw);
      if (!file) continue;
      let target;
      if (/^file:/i.test(raw)) target = toLocalPath(raw.replace(/[?#].*$/, ''));
      else if (/^[A-Za-z]:[\\/]/.test(file)) target = toLocalPath(file);
      else if (file.startsWith('/')) { missing.add(raw); continue; } // 사이트 루트 기준 경로는 알 수 없음
      else target = path.resolve(docDir, file);

      let st;
      try { st = fs.statSync(target); } catch (_) { st = null; }
      if (st && st.isDirectory()) {
        const idx = ['index.html', 'index.htm'].map((n) => path.join(target, n)).find((f) => fs.existsSync(f));
        if (!idx) continue;
        target = idx;
        st = fs.statSync(idx);
      }
      if (!st) { if (!ref.link) missing.add(raw); continue; }
      // <a> 링크는 같은 폴더 안의 파일만 따라간다(디스크 전체를 훑지 않도록).
      const inside = !path.relative(root, target).startsWith('..');
      if (ref.link && !inside) continue;
      if (st.size > MAX_FILE) { warnings.push(`100MB에 가까운 파일은 GitHub에 올릴 수 없어 뺐습니다: ${raw}`); continue; }
      if (st.size > BIG_FILE) warnings.push(`${(st.size / 1048576).toFixed(1)}MB 파일: ${raw} (git에 계속 남으니 가능하면 줄이세요)`);

      const targetRel = relFor(target);
      add(target, targetRel);
      // 원래 적힌 상대 경로가 복사본에서도 같은 파일을 가리키면 그대로 둔다.
      const natural = path.posix.normalize(path.posix.join(relDir, file.replace(/\\/g, '/')));
      if (natural !== targetRel || /\\/.test(file)) {
        const replacement = encodeURI(path.posix.relative(relDir, targetRel)) + suffix;
        edits.push({ start: ref.start, end: ref.end, replacement });
      }
    }
    if (edits.length) rewrites.set(rel, edits);
    if (plan.size > MAX_FILES) throw new Error(`파일이 ${MAX_FILES}개를 넘었습니다.`);
  }

  // 복사
  fs.rmSync(destDir, { recursive: true, force: true });
  let bytes = 0;
  for (const [rel, abs] of plan) {
    const dest = path.join(destDir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const edits = rewrites.get(rel);
    if (edits) {
      const buf = fs.readFileSync(abs);
      const { text, encoding } = decodeText(buf);
      let out = text;
      for (const e of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
      fs.writeFileSync(dest, Buffer.from(out, encoding));
    } else {
      fs.copyFileSync(abs, dest);
    }
    bytes += fs.statSync(dest).size;
  }
  if (bytes > 200 * 1048576) warnings.push(`전체 ${(bytes / 1048576).toFixed(0)}MB입니다. GitHub Pages 사이트는 1GB까지라 용량을 확인하세요.`);

  const title = (() => {
    const buf = fs.readFileSync(entry);
    let { text, encoding } = decodeText(buf);
    if (encoding === 'latin1') {
      // UTF-8이 아니면 문서에 적힌 charset(대개 euc-kr)으로 제목만 읽는다.
      const cs = (text.match(/charset=["']?([\w-]+)/i) || [])[1] || 'euc-kr';
      try { text = new TextDecoder(cs).decode(buf); } catch (_) { /* 모르는 charset */ }
    }
    const m = text.match(/<title[^>]*>([^<]*)<\/title>/i);
    return m ? m[1].replace(/\s+/g, ' ').trim() : '';
  })();

  return {
    entry: entryRel,
    files: [...plan.keys()],
    rewritten: [...rewrites.keys()],
    missing: [...missing],
    warnings,
    bytes,
    title,
    source: entry,
  };
}

module.exports = { importPage, toLocalPath, findRefsInHtml, findRefsInCss };
