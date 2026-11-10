#!/usr/bin/env node
// 블로그 글 편집기: 초안 저장 → _posts로 발행 → git commit/push(업로드).
// 외부 패키지 없이 Node 기본 모듈만 사용한다.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { importPage } = require('./pageImport');

const TOOL_DIR = __dirname;
const REPO = path.resolve(TOOL_DIR, '..', '..');
const POSTS_DIR = path.join(REPO, '_posts');
const ASSETS_REL = 'assets/insertedImg';
const ASSETS_DIR = path.join(REPO, ASSETS_REL);
const DRAFTS_DIR = path.join(TOOL_DIR, 'drafts');
const MEDIA_DIR = path.join(DRAFTS_DIR, 'media');
const PUBLIC_DIR = path.join(TOOL_DIR, 'public');
const PORT = Number(process.env.PORT) || 4180;
// 업로드 때 커밋하는 경로. 이미지가 함께 올라가야 글에서 보이므로 assets/insertedImg도 포함한다.
const PAGES_REL = 'pages';
const PAGES_DIR = path.join(REPO, PAGES_REL);
const PAGES_INDEX = path.join(DRAFTS_DIR, 'pages.json'); // 폴더 → 원본 경로 (로컬 기록용)
const COMMIT_PATHS = ['_posts', ASSETS_REL, PAGES_REL];

const BASEURL = (() => {
  try {
    const m = fs.readFileSync(path.join(REPO, '_config.yml'), 'utf8').match(/^baseurl:\s*["']?([^"'#\n]*)/m);
    return m ? m[1].trim().replace(/\/$/, '') : '';
  } catch (_) {
    return '';
  }
})();

const MEDIA_TYPES = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp',
  'image/svg+xml': '.svg', 'video/mp4': '.mp4', 'video/webm': '.webm',
};
const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.ico': 'image/x-icon',
  '.htm': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.ogg': 'audio/ogg', '.wasm': 'application/wasm', '.avif': 'image/avif', '.bmp': 'image/bmp',
};
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v']);

fs.mkdirSync(MEDIA_DIR, { recursive: true });

// ---------- 공통 ----------
function todayKST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
function stampKST() {
  const s = new Date(Date.now() + 9 * 3600 * 1000).toISOString();
  return `${s.slice(0, 10).replace(/-/g, '')}-${s.slice(11, 19).replace(/:/g, '')}`;
}
function slugify(text) {
  return String(text).toLowerCase().replace(/[^\p{L}\p{N}\p{M}_]+/gu, '-').replace(/^-+|-+$/g, '');
}
function isPostName(name) {
  return typeof name === 'string' && /^[^/\\]+\.(md|markdown)$/.test(name) && !name.startsWith('.');
}
function isDraftId(id) {
  return typeof id === 'string' && /^[a-z0-9-]{6,40}$/.test(id);
}
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ---------- 프런트매터 읽기/쓰기 ----------
// 편집기가 다루는 키만 해석하고, 나머지 줄(주석, 다른 키)은 그대로 보존해 다시 쓴다.
const KNOWN_KEYS = new Set(['title', 'date', 'categories', 'tags', 'excerpt', 'feature_text', 'feature_image']);

function unquote(v) {
  v = v.trim();
  if (v.length >= 2 && v[0] === '"' && v.endsWith('"')) {
    try { return JSON.parse(v); } catch (_) { return v.slice(1, -1); }
  }
  if (v.length >= 2 && v[0] === "'" && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  return v;
}

function parseFlowList(v) {
  const inner = v.trim().slice(1, -1);
  return inner.split(',').map((s) => unquote(s)).filter(Boolean);
}

function parseFrontMatter(text) {
  const m = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { data: {}, extra: [], body: text };
  const lines = m[1].split(/\r?\n/);
  const data = {};
  const extra = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const km = line.match(/^([A-Za-z0-9_-]+)\s*:(.*)$/);
    if (!km) { extra.push(line); continue; }
    const key = km[1];
    const rest = km[2].trim();
    // 들여쓴 다음 줄들(목록, 블록 문자열)은 이 키에 속한다
    const cont = [];
    while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || /^-\s/.test(lines[i + 1]) || lines[i + 1].trim() === '')) {
      if (lines[i + 1].trim() === '' && !(i + 2 < lines.length && /^\s+\S/.test(lines[i + 2]))) break;
      cont.push(lines[++i]);
    }
    if (!KNOWN_KEYS.has(key)) { extra.push(line, ...cont); continue; }
    if (/^[|>][-+]?$/.test(rest)) {
      const indent = Math.min(...cont.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
      const blockLines = cont.map((l) => l.slice(Number.isFinite(indent) ? indent : 0));
      data[key] = rest[0] === '>' ? blockLines.join(' ').trim() : blockLines.join('\n').replace(/\s+$/, '');
    } else if (cont.some((l) => /^\s*-\s/.test(l))) {
      data[key] = cont.filter((l) => /^\s*-\s/.test(l)).map((l) => unquote(l.replace(/^\s*-\s*/, '')));
    } else if (rest.startsWith('[') && rest.endsWith(']')) {
      data[key] = parseFlowList(rest);
    } else {
      data[key] = unquote(rest);
    }
  }
  while (extra.length && !extra[extra.length - 1].trim()) extra.pop();
  return { data, extra, body: text.slice(m[0].length) };
}

function toList(v) {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (!v) return [];
  return String(v).split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}

function splitFeatureText(featureText, title) {
  // 기존 글은 "## 제목\n부제" 모양이라, 부제만 꺼내 편집하게 한다.
  const lines = String(featureText || '').split('\n');
  if (lines[0] && /^##\s+/.test(lines[0])) return lines.slice(1).map((l) => l.trim()).join(' ').trim();
  return String(featureText || '').trim() === `## ${title}` ? '' : String(featureText || '').trim();
}

function renderFrontMatter(d, extra = []) {
  const q = (s) => JSON.stringify(String(s));
  const out = ['---', `title: ${q(d.title || '제목 없음')}`, `date: ${d.date}`];
  if (d.categories.length) {
    out.push('categories:');
    d.categories.forEach((c) => out.push(`  - ${q(c)}`));
  }
  out.push(d.excerpt ? `excerpt: ${q(d.excerpt)}` : 'excerpt:');
  if (d.tagline) out.push('feature_text: |', `  ## ${d.title}`, `  ${d.tagline}`);
  else out.push('feature_text:');
  out.push(d.featureImage ? `feature_image: ${q(d.featureImage)}` : 'feature_image:');
  out.push(...extra, '---', '');
  return out.join('\n') + '\n';
}

// ---------- 본문 변환 (md2post.py 규칙과 같게) ----------
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const BLOCK_START = /^\s*(?:[-*+]\s|\d+[.)]\s|#{1,6}(?:\s|$)|>|\||<|`{3}|~{3}|\$\$|(?:[-*_]\s*){3,}$|=+\s*$)/;
const TABLE_DELIMITER = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/;

// 편집기에서 친 줄바꿈이 블로그에서도 줄바꿈이 되도록 줄 끝에 공백 두 칸을 붙인다.
function keepLineBreaks(text) {
  const lines = text.split('\n');
  const out = [];
  let fence = null;
  let inMath = false;
  lines.forEach((line, i) => {
    const fm = line.match(FENCE);
    if (fence) {
      out.push(line);
      if (fm && fm[1][0] === fence[0] && fm[1].length >= fence.length) fence = null;
      return;
    }
    if (fm) { fence = fm[1]; out.push(line); return; }
    if (line.trim() === '$$') { inMath = !inMath; out.push(line); return; }
    const nxt = lines[i + 1] || '';
    const bothQuotes = line.trimStart().startsWith('>') && nxt.trimStart().startsWith('>') && nxt.trim() !== '>';
    const joinable = line.trim() && nxt.trim() && !inMath
      && (bothQuotes || !BLOCK_START.test(nxt))
      && !/^\s*(?:#{1,6}\s|<|(?:[-*_]\s*){3,}$)/.test(line)
      && !(line.includes('|') && nxt.includes('|'))
      && !TABLE_DELIMITER.test(nxt)
      && !line.startsWith('    ') && !line.startsWith('\t')
      && !/(  |\\|<br>|<br\/>|<br \/>)$/.test(line);
    out.push(joinable ? line.replace(/\s+$/, '') + '  ' : line);
  });
  return out.join('\n');
}

// 발행본을 다시 편집할 때는 붙였던 공백 두 칸을 떼어 편집창을 깔끔하게 보여준다.
function stripLineBreaks(text) {
  let fence = null;
  return text.split('\n').map((line) => {
    const fm = line.match(FENCE);
    if (fence) {
      if (fm && fm[1][0] === fence[0] && fm[1].length >= fence.length) fence = null;
      return line;
    }
    if (fm) { fence = fm[1]; return line; }
    return line.replace(/(\S) {2}$/, '$1');
  }).join('\n');
}

// Jekyll이 본문의 {{ }} / {% %}를 Liquid로 해석해 빌드가 깨지지 않게 감싼다.
// 단, 일부러 쓰는 {% include ... %}와 {{ site.xxx }}는 그대로 둔다.
const LIQUID_OPEN = /\{[{%]/g;
function protectLiquid(text) {
  return text.replace(LIQUID_OPEN, (m, offset) => {
    const ahead = text.slice(offset, offset + 40);
    if (/^\{%-?\s*include\s/.test(ahead) || /^\{\{-?\s*site\./.test(ahead)) return m;
    if (/^\{\{ "\{[{%]" \}\}/.test(ahead)) return m;
    return `{{ "${m}" }}`;
  });
}
function unprotectLiquid(text) {
  return text.replace(/\{\{ "(\{[{%])" \}\}/g, '$1');
}

// ---------- 발행된 글 ----------
function listPostFiles() {
  try {
    return fs.readdirSync(POSTS_DIR).filter(isPostName).sort().reverse();
  } catch (_) {
    return [];
  }
}

function readPost(name) {
  if (!isPostName(name)) throw new HttpError(400, '잘못된 파일 이름입니다.');
  const file = path.join(POSTS_DIR, name);
  if (!fs.existsSync(file)) throw new HttpError(404, '발행된 글을 찾을 수 없습니다.');
  const raw = fs.readFileSync(file, 'utf8');
  const { data, extra, body } = parseFrontMatter(raw);
  const fileDate = (name.match(/^(\d{4}-\d{2}-\d{2})-/) || [])[1] || todayKST();
  const title = data.title || name.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.\w+$/, '');
  // 줄 끝 공백 두 칸이 한 번이라도 쓰였으면 "줄바꿈 유지" 방식으로 쓴 글로 본다.
  const lineBreaks = /\S {2}\n/.test(body);
  const cleanBody = unprotectLiquid(lineBreaks ? stripLineBreaks(body) : body).replace(/^\n+/, '');
  return {
    postFile: name,
    title,
    date: String(data.date || fileDate).slice(0, 10),
    categories: toList(data.categories || data.tags),
    excerpt: String(data.excerpt || '').replace(/\s*\n\s*/g, ' ').trim(),
    tagline: splitFeatureText(data.feature_text, title),
    featureImage: data.feature_image || '',
    lineBreaks,
    body: cleanBody,
    extra,
    mtime: fs.statSync(file).mtimeMs,
  };
}

function nextPostNumber() {
  let max = 0;
  for (const name of listPostFiles()) {
    const m = name.match(/^\d{4}-\d{2}-\d{2}-(\d+)-/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

// ---------- 초안 ----------
function draftPath(id) {
  if (!isDraftId(id)) throw new HttpError(400, '잘못된 초안 id입니다.');
  return path.join(DRAFTS_DIR, `${id}.json`);
}
function readDraft(id) {
  const file = draftPath(id);
  if (!fs.existsSync(file)) throw new HttpError(404, '초안을 찾을 수 없습니다.');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function listDrafts() {
  return fs.readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith('.json') && isDraftId(f.slice(0, -5)))
    .map((f) => { try { return JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, f), 'utf8')); } catch (_) { return null; } })
    .filter((d) => d && d.id && typeof d.body === 'string')
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}
function cleanDraftInput(input, existing = {}) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date || '') ? input.date : todayKST();
  return {
    ...existing,
    title: String(input.title || '').trim(),
    date,
    categories: toList(input.categories).map((c) => c.replace(/^#/, '')).filter((c, i, a) => a.indexOf(c) === i),
    excerpt: String(input.excerpt || '').replace(/\s*\n\s*/g, ' ').trim(),
    tagline: String(input.tagline || '').replace(/\s*\n\s*/g, ' ').trim(),
    featureImage: String(input.featureImage || '').trim(),
    lineBreaks: input.lineBreaks !== false,
    body: String(input.body || '').replace(/\r\n/g, '\n'),
    postFile: existing.postFile || (isPostName(input.postFile) ? input.postFile : null),
    extra: existing.extra || (Array.isArray(input.extra) ? input.extra.map(String) : []),
  };
}
function saveDraft(input) {
  let draft;
  if (input.id) {
    draft = cleanDraftInput(input, readDraft(input.id));
  } else {
    let extra = [];
    if (isPostName(input.postFile)) {
      // 발행된 글을 고치는 경우, 같은 글의 초안이 이미 있으면 그것을 갱신한다.
      const same = listDrafts().find((d) => d.postFile === input.postFile);
      if (same) return saveDraft({ ...input, id: same.id });
      try { extra = readPost(input.postFile).extra; } catch (_) { /* 글이 사라졌으면 새 글처럼 */ }
    }
    draft = cleanDraftInput({ ...input, extra });
    draft.id = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    draft.createdAt = new Date().toISOString();
  }
  draft.updatedAt = new Date().toISOString();
  fs.writeFileSync(draftPath(draft.id), JSON.stringify(draft, null, 2));
  return draft;
}
function deleteDraft(id, { keepMedia = false } = {}) {
  fs.rmSync(draftPath(id), { force: true });
  if (!keepMedia) fs.rmSync(path.join(MEDIA_DIR, id), { recursive: true, force: true });
}

// ---------- 발행 ----------
function postNameFor(draft) {
  const slug = slugify(draft.title) || 'untitled';
  if (draft.postFile) {
    // 이미 발행된 글은 번호를 유지하고, 날짜·제목이 바뀌었을 때만 이름을 바꾼다.
    const m = draft.postFile.match(/^\d{4}-\d{2}-\d{2}-(\d+)-/);
    const old = readPostSafe(draft.postFile);
    if (old && old.date === draft.date && old.title === draft.title) return draft.postFile;
    return m ? `${draft.date}-${m[1]}-${slug}.md` : `${draft.date}-${slug}.md`;
  }
  return `${draft.date}-${nextPostNumber()}-${slug}.md`;
}
function readPostSafe(name) {
  try { return readPost(name); } catch (_) { return null; }
}

// 초안 전용 이미지(/draft-media/<id>/x.png)를 글 폴더(assets/insertedImg/<글이름>/)로 옮기고 링크를 바꾼다.
function moveDraftMedia(draft, postBase, text) {
  const prefix = `/draft-media/${draft.id}/`;
  const dest = path.join(ASSETS_DIR, postBase);
  const sitePrefix = `${BASEURL}/${ASSETS_REL}/${postBase}/`;
  const re = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([A-Za-z0-9._-]+)`, 'g');
  return text.replace(re, (whole, file) => {
    const src = path.join(MEDIA_DIR, draft.id, file);
    if (!fs.existsSync(src)) return whole;
    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(src, path.join(dest, file));
    return sitePrefix + file;
  });
}

function videoTags(text) {
  // ![설명](x.mp4)는 블로그에서 재생되도록 <video>로 바꾼다.
  return text.replace(/!\[([^\]]*)\]\(\s*<?([^)\s>]+\.(?:mp4|webm|mov|m4v))>?\s*\)/gi, (m, alt, url) =>
    `<video class="video-file" controls preload="metadata" playsinline src="${url}"${alt ? ` aria-label="${alt.replace(/"/g, '&quot;')}"` : ''}></video>`);
}

function publish(id) {
  const draft = readDraft(id);
  if (!draft.title) throw new HttpError(400, '제목을 입력해야 발행할 수 있습니다.');
  const name = postNameFor(draft);
  const base = name.replace(/\.\w+$/, '');
  const target = path.join(POSTS_DIR, name);
  if (name !== draft.postFile && fs.existsSync(target)) {
    throw new HttpError(409, `같은 이름의 글이 이미 있습니다: _posts/${name}`);
  }

  let body = moveDraftMedia(draft, base, draft.body);
  const featureImage = moveDraftMedia(draft, base, draft.featureImage);
  body = videoTags(body);
  if (draft.lineBreaks) body = keepLineBreaks(body);
  body = protectLiquid(body);
  const text = renderFrontMatter({ ...draft, featureImage }, draft.extra) + body.replace(/\s*$/, '\n');

  fs.mkdirSync(POSTS_DIR, { recursive: true });
  fs.writeFileSync(target, text);
  if (draft.postFile && draft.postFile !== name) fs.rmSync(path.join(POSTS_DIR, draft.postFile), { force: true });
  deleteDraft(draft.id);
  return { postFile: name };
}

// ---------- 정적 HTML 페이지 (pages/<폴더>/) ----------
function readPagesIndex() {
  try { return JSON.parse(fs.readFileSync(PAGES_INDEX, 'utf8')); } catch (_) { return {}; }
}
function pageUrl(folder, entry) {
  // 마크다운 링크가 깨지지 않게 공백·괄호만 인코딩한다(한글은 그대로 둬도 열린다).
  return `${BASEURL}/${PAGES_REL}/${folder}/${entry}`.replace(/[ ()]/g, (c) => encodeURIComponent(c));
}
function listPages() {
  const index = readPagesIndex();
  let dirs = [];
  try { dirs = fs.readdirSync(PAGES_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch (_) { /* 아직 없음 */ }
  return dirs.map((folder) => {
    const dir = path.join(PAGES_DIR, folder);
    const info = index[folder] || {};
    const htmls = fs.readdirSync(dir).filter((f) => /\.html?$/i.test(f));
    const entry = info.entry && htmls.includes(info.entry) ? info.entry : (htmls.find((f) => /^index\.html?$/i.test(f)) || htmls[0]);
    if (!entry) return null;
    return { folder, entry, url: pageUrl(folder, entry), title: info.title || '', source: info.source || '', importedAt: info.importedAt || '' };
  }).filter(Boolean).sort((a, b) => (b.importedAt || '').localeCompare(a.importedAt || '') || a.folder.localeCompare(b.folder));
}
function importHtmlPage({ source, name, wholeFolder }) {
  if (!source || !String(source).trim()) throw new HttpError(400, 'HTML 파일 경로를 입력하세요.');
  const index = readPagesIndex();
  const { toLocalPath } = require('./pageImport');
  const abs = path.resolve(toLocalPath(source));
  // 폴더 이름: 직접 준 이름 → index.html이면 그 폴더 이름 → 파일 이름
  const stem = path.basename(abs).replace(/\.[^.]+$/, '');
  const base = slugify(name || (/^index$/i.test(stem) ? path.basename(path.dirname(abs)) : stem)).replace(/^[_.]+/, '') || 'page';
  // 같은 원본을 다시 가져오면 같은 폴더를 갱신하고, 다른 원본이 이름을 쓰고 있으면 -2, -3…을 붙인다.
  let folder = base;
  for (let n = 2; fs.existsSync(path.join(PAGES_DIR, folder)) && index[folder]?.source !== abs; n++) folder = `${base}-${n}`;
  const updating = index[folder]?.source === abs;
  let result;
  try {
    result = importPage({ source: abs, destDir: path.join(PAGES_DIR, folder), wholeFolder: Boolean(wholeFolder) });
  } catch (err) {
    throw new HttpError(400, err.message);
  }
  index[folder] = { source: abs, entry: result.entry, title: result.title, wholeFolder: Boolean(wholeFolder), importedAt: new Date().toISOString() };
  fs.writeFileSync(PAGES_INDEX, JSON.stringify(index, null, 2));
  return { ...result, folder, path: `${PAGES_REL}/${folder}/${result.entry}`, url: pageUrl(folder, result.entry), updated: updating };
}

// ---------- git ----------
function git(args, { timeout = 60000 } = {}) {
  return new Promise((resolve) => {
    execFile('git', args, {
      cwd: REPO, timeout, maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C.UTF-8' },
    }, (err, stdout, stderr) => resolve({ ok: !err, code: err ? err.code : 0, stdout, stderr }));
  });
}

async function gitStatus() {
  const st = await git(['-c', 'core.quotepath=off', 'status', '--porcelain=v1', '-uall', '--', ...COMMIT_PATHS]);
  const changes = st.stdout.split('\n').filter(Boolean).map((l) => ({ code: l.slice(0, 2).trim() || '?', path: l.slice(3).replace(/^"|"$/g, '') }));
  const branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'])).stdout.trim();
  const ahead = await git(['rev-list', '--count', '@{u}..HEAD']);
  return { branch, changes, ahead: ahead.ok ? Number(ahead.stdout.trim()) : 0, hasUpstream: ahead.ok };
}

// gh로 로그인돼 있으면 그 자격 증명으로 push한다(창에서 비밀번호를 물어볼 수 없으므로).
function pushArgs() {
  return ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', 'origin', 'HEAD'];
}

// git add/commit에 아직 없는 폴더(예: HTML을 한 번도 안 가져와 생기지 않은 pages/)를 넘기면
// "pathspec did not match"로 실패하므로, 디스크에 있거나 git이 이미 아는 경로만 쓴다.
async function presentCommitPaths() {
  const out = [];
  for (const rel of COMMIT_PATHS) {
    if (fs.existsSync(path.join(REPO, rel))) { out.push(rel); continue; }
    const tracked = await git(['ls-files', '--', rel]);
    if (tracked.ok && tracked.stdout.trim()) out.push(rel); // 폴더째 지운 경우
  }
  return out;
}

async function upload(message) {
  const before = await gitStatus();
  const log = [];
  if (before.changes.length) {
    const paths = await presentCommitPaths();
    const add = await git(['add', '-A', '--', ...paths]);
    if (!add.ok) throw new HttpError(500, `git add 실패\n${add.stderr}`);
    const titles = before.changes
      .filter((c) => c.path.startsWith('_posts/') && c.code !== 'D')
      .map((c) => readPostSafe(path.basename(c.path))?.title).filter(Boolean);
    const folders = [...new Set(before.changes.filter((c) => c.path.startsWith(`${PAGES_REL}/`)).map((c) => c.path.split('/')[1]))];
    const parts = [titles.length && `Post Uploading: ${titles.join(', ')}`, folders.length && `pages: ${folders.join(', ')}`].filter(Boolean);
    const msg = (message || '').trim() || parts.join(' / ') || 'Post Uploading: 글 정리';
    const commit = await git(['-c', 'core.quotepath=off', 'commit', '-m', msg, '--', ...paths]);
    if (!commit.ok) throw new HttpError(500, `git commit 실패\n${commit.stdout}${commit.stderr}`);
    log.push(commit.stdout.trim());
  } else if (!before.ahead) {
    throw new HttpError(400, '올릴 변경 사항이 없습니다.');
  }
  const ghOk = (await new Promise((r) => execFile('gh', ['auth', 'status'], (e) => r(!e))));
  const push = await git(ghOk ? pushArgs() : ['push', 'origin', 'HEAD'], { timeout: 120000 });
  if (!push.ok) {
    throw new HttpError(500, `커밋은 됐지만 push에 실패했습니다. (다음 업로드 때 다시 시도합니다)\n${push.stderr}`);
  }
  log.push(push.stderr.trim() || push.stdout.trim());
  return { log: log.join('\n\n') };
}

// 목록에 보일 짧은 미리보기: 마크다운 기호, 코드, 이미지, Liquid는 뺀다.
function plainPreview(body) {
  return body
    .replace(/(```|~~~)[\s\S]*?\1/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)|<[^>]+>|\{[{%][\s\S]*?[%}]\}/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]+/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 140);
}

// ---------- HTTP ----------
function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, '파일이 너무 큽니다.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const buf = await readBody(req, 20 * 1024 * 1024);
  try { return JSON.parse(buf.toString('utf8') || '{}'); } catch (_) { throw new HttpError(400, 'JSON 형식이 아닙니다.'); }
}
function serveFile(res, root, rel) {
  const file = path.resolve(root, '.' + path.sep + rel);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  }
  res.writeHead(200, { 'Content-Type': STATIC_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);
  const method = req.method;
  let m;

  // 다른 웹사이트가 이 로컬 서버로 발행·업로드 요청을 보내지 못하게, 주소와 출처를 확인한다.
  const host = (req.headers.host || '').replace(/:\d+$/, '');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) throw new HttpError(403, '허용되지 않은 주소입니다.');
  if (method !== 'GET' && req.headers.origin) {
    let originHost = '';
    try { originHost = new URL(req.headers.origin).hostname; } catch (_) { /* 잘못된 Origin */ }
    if (!['localhost', '127.0.0.1', '[::1]'].includes(originHost)) throw new HttpError(403, '허용되지 않은 요청입니다.');
  }

  if (p === '/api/shutdown' && method === 'POST') {
    // 트레이 앱이 종료할 때 부른다.
    send(res, 200, { ok: true });
    setTimeout(() => process.exit(0), 100);
    return undefined;
  }
  if (p === '/api/config') return send(res, 200, { baseurl: BASEURL, repo: REPO, today: todayKST() });

  if (p === '/api/posts' && method === 'GET') {
    const status = await gitStatus();
    const pending = new Set(status.changes.map((c) => c.path));
    const drafts = listDrafts();
    const posts = listPostFiles().map((name) => {
      const post = readPostSafe(name);
      if (!post) return null;
      return {
        postFile: name, title: post.title, date: post.date, categories: post.categories,
        excerpt: post.excerpt || plainPreview(post.body),
        pending: pending.has(`_posts/${name}`),
        draftId: (drafts.find((d) => d.postFile === name) || {}).id || null,
      };
    }).filter(Boolean);
    return send(res, 200, posts);
  }
  if ((m = p.match(/^\/api\/posts\/([^/]+)$/)) && method === 'GET') return send(res, 200, readPost(m[1]));

  if (p === '/api/drafts' && method === 'GET') {
    return send(res, 200, listDrafts().map(({ body, extra, ...d }) => ({ ...d, excerpt: d.excerpt || plainPreview(body) })));
  }
  if (p === '/api/drafts' && method === 'POST') return send(res, 201, saveDraft(await readJson(req)));
  if ((m = p.match(/^\/api\/drafts\/([^/]+)$/))) {
    if (method === 'GET') return send(res, 200, readDraft(m[1]));
    if (method === 'PUT') return send(res, 200, saveDraft({ ...(await readJson(req)), id: m[1] }));
    if (method === 'DELETE') { readDraft(m[1]); deleteDraft(m[1]); return send(res, 200, { ok: true }); }
  }
  if ((m = p.match(/^\/api\/drafts\/([^/]+)\/publish$/)) && method === 'POST') return send(res, 200, publish(m[1]));

  if ((m = p.match(/^\/api\/drafts\/([^/]+)\/media$/)) && method === 'POST') {
    readDraft(m[1]);
    const type = (req.headers['content-type'] || '').split(';')[0].trim();
    const ext = MEDIA_TYPES[type];
    if (!ext) throw new HttpError(400, 'PNG, JPG, GIF, WEBP, SVG 이미지나 MP4, WEBM 영상만 넣을 수 있습니다.');
    const buf = await readBody(req, 95 * 1024 * 1024);
    if (!buf.length) throw new HttpError(400, '빈 파일입니다.');
    const dir = path.join(MEDIA_DIR, m[1]);
    fs.mkdirSync(dir, { recursive: true });
    const name = `${stampKST()}-${crypto.randomBytes(2).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(dir, name), buf);
    return send(res, 201, {
      url: `/draft-media/${m[1]}/${name}`,
      video: VIDEO_EXT.has(ext),
      warning: buf.length > 1_000_000 ? `파일이 ${(buf.length / 1e6).toFixed(1)}MB입니다. git 저장소에 영원히 남으니 가능하면 줄여서 넣으세요.` : null,
    });
  }

  if (p === '/api/pages' && method === 'GET') return send(res, 200, listPages());
  if (p === '/api/pages/import' && method === 'POST') return send(res, 200, importHtmlPage(await readJson(req)));

  if (p === '/api/git/status' && method === 'GET') return send(res, 200, await gitStatus());
  if (p === '/api/git/upload' && method === 'POST') return send(res, 200, await upload((await readJson(req)).message));

  if (method !== 'GET') throw new HttpError(404, '없는 주소입니다.');
  if ((m = p.match(/^\/draft-media\/(.+)$/))) return serveFile(res, MEDIA_DIR, m[1]);
  // 미리보기에서 블로그 경로(/FirstBlog/assets/...) 이미지가 보이도록 저장소의 assets를 그대로 내준다.
  if (p.startsWith(`${BASEURL}/assets/`)) return serveFile(res, path.join(REPO, 'assets'), p.slice(`${BASEURL}/assets/`.length));
  if (p.startsWith(`${BASEURL}/${PAGES_REL}/`)) {
    let rel = p.slice(`${BASEURL}/${PAGES_REL}/`.length);
    if (rel.endsWith('/') || !path.extname(rel)) rel = rel.replace(/\/?$/, '/index.html'); // GitHub Pages처럼 폴더 주소는 index.html
    return serveFile(res, PAGES_DIR, rel);
  }
  return serveFile(res, PUBLIC_DIR, p === '/' ? 'index.html' : p.slice(1));
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    if (!(err instanceof HttpError)) console.error(err);
    if (!res.headersSent) send(res, err.status || 500, { error: err.message || String(err) });
  });
});

// 같은 PC의 브라우저에서만 쓰도록 localhost에만 연다(WSL에서도 Windows 브라우저로 접속 가능).
if (require.main === module) server.listen(PORT, '127.0.0.1', () => {
  console.log(`블로그 글 편집기: http://localhost:${PORT}`);
  console.log(`저장소: ${REPO}`);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`포트 ${PORT}번이 이미 사용 중입니다. 편집기가 이미 실행 중이면 브라우저에서 http://localhost:${PORT} 로 접속하세요.`);
    process.exit(1);
  }
  throw err;
});

module.exports = { parseFrontMatter, keepLineBreaks, stripLineBreaks, protectLiquid, unprotectLiquid, slugify };
