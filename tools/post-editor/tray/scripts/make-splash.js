// exe가 압축을 푸는 동안 보이는 시작 그림(assets/splash.bmp)을 만든다.
// Electron으로 HTML을 화면 밖에서 그려 24비트 BMP로 저장한다(electron-builder의 portable.splashImage는 BMP만 받음).
// 실행: npm run splash   (만든 BMP는 저장소에 커밋해 두므로 아이콘·문구를 바꿀 때만 다시 실행)
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const W = 480;
const H = 200;
const assets = path.join(__dirname, '..', 'assets');
const font = path.resolve(__dirname, '..', '..', '..', '..', 'assets', 'fonts', 'D2Coding-Bold.woff2');

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: D2; src: url("${pathToFileURL(font).href}"); }
html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
body { background: #1a1b1e; color: #e6e6e6; font-family: D2, sans-serif; display: flex; align-items: center; gap: 24px;
  padding: 0 36px; box-sizing: border-box; border: 1px solid #35363a; }
img { width: 96px; height: 96px; }
h1 { margin: 0 0 10px; font-size: 26px; }
p { margin: 0; color: #9a9ba0; font-size: 15px; }
.bar { margin-top: 18px; width: 260px; height: 4px; border-radius: 2px; background: #2a2b2f; overflow: hidden; }
.bar i { display: block; width: 40%; height: 100%; background: #6fb8e0; border-radius: 2px; }
</style><img src="${pathToFileURL(path.join(assets, 'icon.png')).href}"><div><h1>블로그 글 편집기</h1><p>시작하는 중…</p><div class="bar"><i></i></div></div>`;

function toBmp(bgra, width, height) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const out = Buffer.alloc(54 + rowSize * height);
  out.write('BM', 0);
  out.writeUInt32LE(out.length, 2);
  out.writeUInt32LE(54, 10);
  out.writeUInt32LE(40, 14);
  out.writeInt32LE(width, 18);
  out.writeInt32LE(height, 22); // 양수: 아래 줄부터
  out.writeUInt16LE(1, 26);
  out.writeUInt16LE(24, 28);
  out.writeUInt32LE(rowSize * height, 34);
  for (let y = 0; y < height; y++) {
    const dst = 54 + (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      out[dst + x * 3] = bgra[s];
      out[dst + x * 3 + 1] = bgra[s + 1];
      out[dst + x * 3 + 2] = bgra[s + 2];
    }
  }
  return out;
}

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  try {
  const win = new BrowserWindow({ width: W, height: H, show: false, frame: false, useContentSize: true,
    webPreferences: { offscreen: true } });
  win.webContents.setFrameRate(5);
  const page = path.join(os.tmpdir(), `post-editor-splash-${process.pid}.html`);
  fs.writeFileSync(page, html);
  await win.loadFile(page);
  fs.rmSync(page, { force: true });
  await win.webContents.executeJavaScript('document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 300)))');
  const image = (await win.webContents.capturePage()).resize({ width: W, height: H });
  const { width, height } = image.getSize();
  fs.writeFileSync(path.join(assets, 'splash.bmp'), toBmp(image.toBitmap(), width, height));
  fs.writeFileSync(path.join(assets, 'splash-preview.png'), image.toPNG());
  console.log(`시작 그림 생성: assets/splash.bmp (${width}x${height})`);
  app.exit(0);
  } catch (err) {
    console.error(err);
    app.exit(1);
  }
});
