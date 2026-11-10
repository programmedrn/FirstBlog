// 블로그 글 편집기 트레이 앱(Windows).
// WSL 안의 편집기 서버(tools/post-editor/server.js)를 창 없이 띄우고, 편집기를 자체 창으로 보여준다.
// git·gh 인증은 WSL 쪽 것을 그대로 쓴다. 트레이 메뉴의 "종료"로 서버까지 함께 끈다.
const { app, Tray, Menu, BrowserWindow, shell, dialog, nativeImage, ipcMain } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const APP_NAME = '블로그 글 편집기';
const START_TIMEOUT_MS = 45000; // WSL이 꺼져 있으면 켜는 데 시간이 걸린다

function reportFatal(title, err) {
  console.error(title, err);
  try { dialog.showErrorBox(title, (err && err.stack) || String(err)); } catch (_) { /* 너무 이른 시점 */ }
}
process.on('uncaughtException', (err) => reportFatal(`${APP_NAME} 오류`, err));
process.on('unhandledRejection', (err) => reportFatal(`${APP_NAME} 오류`, err));

// ---------- 설정 ----------
// 기본값은 빌드할 때 defaults.json에 들어가고, %APPDATA%\블로그 글 편집기\config.json으로 덮어쓸 수 있다.
function loadConfig() {
  let defaults = { distro: '', repo: '', port: 4180 };
  try { defaults = { ...defaults, ...JSON.parse(fs.readFileSync(path.join(__dirname, 'defaults.json'), 'utf8')) }; } catch (_) { /* 기본값 */ }
  const file = path.join(app.getPath('userData'), 'config.json');
  let user = {};
  try {
    user = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(defaults, null, 2) + '\n');
    } catch (_) { /* 못 써도 기본값으로 동작 */ }
  }
  return { ...defaults, ...user, file };
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let config;
  let baseUrl;
  let tray = null;
  let win = null;
  let server = null;      // 이 앱이 띄운 wsl.exe 프로세스
  let ownsServer = false; // 이미 떠 있던 서버를 쓰는 경우에는 종료할 때 끄지 않는다
  let starting = null;
  let quitting = false;
  let cleanedUp = false;
  const log = [];

  const addLog = (text) => {
    log.push(...String(text).split(/\r?\n/).filter(Boolean));
    if (log.length > 200) log.splice(0, log.length - 200);
  };

  function request(method, pathname, timeout = 1500) {
    return new Promise((resolve) => {
      const req = http.request(`${baseUrl}${pathname}`, { method, timeout, headers: { Origin: baseUrl } }, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode >= 200 && res.statusCode < 300));
      });
      req.on('timeout', () => req.destroy());
      req.on('error', () => resolve(false));
      req.end();
    });
  }
  const ping = () => request('GET', '/api/config');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- 서버 ----------
  function startServer() {
    if (starting) return starting;
    starting = (async () => {
      if (await ping()) return true;
      if (!config.repo) throw new Error(`저장소 경로가 설정되지 않았습니다.\n${config.file} 의 "repo"를 채워 주세요.`);
      const args = [
        ...(config.distro ? ['-d', config.distro] : []),
        '--cd', config.repo, '--',
        'bash', '-lc', `NO_BROWSER=1 PORT=${Number(config.port) || 4180} exec ./tools/post-editor/run.sh`,
      ];
      setStep('WSL에서 편집기 서버 시작 중…');
      addLog(`> wsl.exe ${args.join(' ')}`);
      const child = spawn('wsl.exe', args, { windowsHide: true });
      server = child;
      ownsServer = true;
      let exited = false;
      child.stdout.on('data', (d) => addLog(d));
      child.stderr.on('data', (d) => addLog(d));
      child.on('error', (err) => { exited = true; addLog(`실행 실패: ${err.message}`); });
      child.on('exit', (code) => {
        exited = true;
        addLog(`서버 종료 (code ${code})`);
        if (server === child) server = null;
      });
      const until = Date.now() + START_TIMEOUT_MS;
      while (Date.now() < until) {
        if (await ping()) return true;
        if (exited) break;
        await sleep(300);
      }
      throw new Error('편집기 서버가 시작되지 않았습니다.');
    })().finally(() => { starting = null; });
    return starting;
  }

  async function stopServer() {
    if (!ownsServer) return;
    await request('POST', '/api/shutdown', 3000);
    const child = server;
    if (child) {
      await Promise.race([new Promise((r) => child.once('exit', r)), sleep(2000)]);
      try { child.kill(); } catch (_) { /* 이미 종료 */ }
    }
    server = null;
    ownsServer = false;
  }

  // ---------- 창 ----------
  const page = (title, body) => `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html lang="ko"><meta charset="utf-8">
<style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#1a1b1e;color:#e6e6e6;
font-family:"Segoe UI","Malgun Gothic",sans-serif}main{max-width:760px;padding:24px}h1{font-size:20px}
pre{background:#232427;border:1px solid #35363a;border-radius:8px;padding:12px;font-size:12px;white-space:pre-wrap;max-height:50vh;overflow:auto}
p{color:#9a9ba0;line-height:1.6}</style><main><h1>${title}</h1>${body}</main></html>`)}`;
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

  function createWindow() {
    win = new BrowserWindow({
      width: 1440,
      height: 900,
      show: false,
      title: APP_NAME,
      autoHideMenuBar: true,
      backgroundColor: '#1a1b1e',
      icon: path.join(__dirname, 'assets', 'icon.png'),
      webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') },
    });
    win.setMenuBarVisibility(false);

    // 창을 닫으면 트레이로 숨는다. 완전 종료는 트레이 메뉴의 "종료".
    win.on('close', (e) => {
      if (!quitting) { e.preventDefault(); win.hide(); }
    });
    // 저장 안 한 내용 확인은 종료할 때 직접 묻기 때문에, 페이지의 beforeunload가 종료를 막지 않게 한다.
    win.webContents.on('will-prevent-unload', (e) => e.preventDefault());
    // 글 속 링크 등 편집기 밖 주소는 기본 브라우저로 연다.
    win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
    win.webContents.on('will-navigate', (e, url) => {
      if (!url.startsWith(baseUrl) && !url.startsWith('data:')) { e.preventDefault(); shell.openExternal(url); }
    });
    win.webContents.on('page-title-updated', (e) => e.preventDefault());
  }

  // 서버가 뜰 때까지 보여 주는 화면: 도는 표시, 지금 단계, 경과 시간
  const loadingPage = () => page('편집기를 시작하는 중…', `
<style>.spin{width:34px;height:34px;border:3px solid #35363a;border-top-color:#6fb8e0;border-radius:50%;animation:s .8s linear infinite;margin-bottom:18px}
@keyframes s{to{transform:rotate(360deg)}}#step{color:#e6e6e6}#sec{font-variant-numeric:tabular-nums}</style>
<div class="spin"></div>
<p><span id="step">편집기 서버 확인 중…</span> <span id="sec"></span></p>
<p>처음 켤 때나 WSL이 꺼져 있었다면 10~20초쯤 걸릴 수 있어요.</p>
<script>const t0=Date.now();setInterval(()=>{document.getElementById('sec').textContent='('+Math.floor((Date.now()-t0)/1000)+'초)'},500);
window.setStep=(s)=>{document.getElementById('step').textContent=s};</script>`);

  function setStep(text) {
    if (tray) tray.setToolTip(`${APP_NAME} — ${text}`);
    if (win && !win.isDestroyed() && win.webContents.getURL().startsWith('data:')) {
      win.webContents.executeJavaScript(`window.setStep && window.setStep(${JSON.stringify(text)})`).catch(() => {});
    }
  }

  async function loadEditor() {
    if (!win || win.isDestroyed()) createWindow();
    const current = win.webContents.getURL();
    if (current.startsWith(baseUrl) && await ping()) return;
    await win.loadURL(loadingPage());
    try {
      await startServer();
      setStep('편집기 화면 여는 중…');
      await win.loadURL(baseUrl);
      if (tray) tray.setToolTip(APP_NAME);
    } catch (err) {
      if (tray) tray.setToolTip(`${APP_NAME} — 시작 실패 (열어서 확인)`);
      win.loadURL(page('편집기를 시작하지 못했습니다', `<p>${esc(err.message)}</p>
<p>트레이 아이콘 메뉴의 <b>서버 다시 시작</b>으로 다시 시도할 수 있어요. WSL 배포판이나 저장소 경로가 다르면 <b>설정 파일 열기</b>에서 고친 뒤 다시 시작하세요.</p>
<p>설정: ${esc(config.file)}<br>배포판: ${esc(config.distro || '(기본)')} · 저장소: ${esc(config.repo)} · 포트: ${esc(config.port)}</p>
<pre>${esc(log.slice(-40).join('\n') || '(로그 없음)')}</pre>`));
    }
  }

  async function showWindow() {
    if (!win || win.isDestroyed()) createWindow();
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    win.webContents.focus();
    loadEditor();
  }

  async function restartServer() {
    await stopServer();
    if (await ping()) {
      // 다른 곳(run.sh 등)에서 띄운 서버가 떠 있으면 그것도 끄고 새로 띄운다.
      await request('POST', '/api/shutdown', 3000);
      await sleep(500);
    }
    log.length = 0;
    if (win && !win.isDestroyed()) win.loadURL('about:blank');
    showWindow();
  }

  // ---------- 종료 ----------
  async function isDirty() {
    if (!win || win.isDestroyed() || !win.webContents.getURL().startsWith(baseUrl)) return false;
    try { return Boolean(await win.webContents.executeJavaScript('window.__postEditorDirty ? window.__postEditorDirty() : false')); } catch (_) { return false; }
  }

  async function quitApp() {
    if (quitting) return;
    if (await isDirty()) {
      win.show();
      const { response } = await dialog.showMessageBox(win, {
        type: 'warning',
        buttons: ['종료', '취소'],
        defaultId: 1,
        cancelId: 1,
        title: APP_NAME,
        message: '저장하지 않은 글이 있습니다.',
        detail: '종료하면 마지막 저장 이후에 쓴 내용은 사라집니다.',
      });
      if (response !== 0) return;
    }
    quitting = true;
    if (tray) tray.setToolTip(`${APP_NAME} — 종료하는 중…`);
    await stopServer();
    cleanedUp = true;
    app.quit();
  }

  // Windows 로그오프 등으로 바로 종료될 때도 서버를 끄고 나간다.
  app.on('before-quit', (e) => {
    if (cleanedUp) return;
    e.preventDefault();
    quitting = true;
    stopServer().finally(() => { cleanedUp = true; app.quit(); });
  });

  // ---------- 트레이 ----------
  const exePath = () => process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  const loginSettings = () => app.getLoginItemSettings({ path: exePath(), args: ['--hidden'] });

  function buildMenu() {
    return Menu.buildFromTemplate([
      { label: '편집기 열기', click: showWindow },
      { label: '기본 브라우저로 열기', click: async () => { try { await startServer(); shell.openExternal(baseUrl); } catch (err) { showWindow(); } } },
      { type: 'separator' },
      { label: '서버 다시 시작', click: restartServer },
      { label: '설정 파일 열기', click: () => shell.openPath(config.file) },
      {
        label: 'Windows 시작 시 자동 실행',
        type: 'checkbox',
        checked: loginSettings().openAtLogin,
        click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked, path: exePath(), args: ['--hidden'] });
          tray.setContextMenu(buildMenu());
        },
      },
      { type: 'separator' },
      { label: '종료', click: quitApp },
    ]);
  }

  // 편집기의 "HTML 페이지 올리기"에서 쓰는 파일 선택 창
  ipcMain.handle('pick-html', async (e) => {
    const r = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
      title: '올릴 HTML 파일 선택',
      properties: ['openFile'],
      filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
    });
    return r.canceled ? null : r.filePaths[0];
  });

  app.on('second-instance', showWindow);
  app.on('window-all-closed', (e) => e.preventDefault());

  app.whenReady().then(() => {
    app.setAppUserModelId('io.github.programmedrn.post-editor');
    config = loadConfig();
    baseUrl = `http://127.0.0.1:${Number(config.port) || 4180}`;

    // 누르자마자 보이도록 창(로딩 화면)을 트레이보다 먼저 띄운다.
    const hidden = process.argv.includes('--hidden');
    createWindow();
    if (!hidden) showWindow();

    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png')));
    tray.setToolTip(`${APP_NAME} — 시작하는 중…`);
    tray.setContextMenu(buildMenu());
    tray.on('click', showWindow);

    // 로그인 때 자동 실행이면 창 없이 서버만 미리 띄워 둔다.
    if (hidden) {
      startServer()
        .then(() => tray.setToolTip(APP_NAME))
        .catch((err) => { addLog(err.message); tray.setToolTip(`${APP_NAME} — 시작 실패 (열어서 확인)`); });
    }
  }).catch((err) => reportFatal(`${APP_NAME} 시작 실패`, err));
}
