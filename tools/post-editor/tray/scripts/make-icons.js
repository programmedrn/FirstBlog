// 외부 도구 없이 아이콘 PNG와 ICO(PNG를 그대로 담는 형식)를 만든다.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 4x 슈퍼샘플링으로 가장자리를 부드럽게
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
        const c = pixel((x + (sx + 0.5) / 4) / size, (y + (sy + 0.5) / 4) / size);
        acc[0] += c[0] * c[3]; acc[1] += c[1] * c[3]; acc[2] += c[2] * c[3]; acc[3] += c[3];
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      const a = acc[3] / 16;
      raw[o] = a ? acc[0] / acc[3] : 0; raw[o + 1] = a ? acc[1] / acc[3] : 0; raw[o + 2] = a ? acc[2] / acc[3] : 0; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// 둥근 사각형 위에 글 줄 세 개와 위쪽 화살표(업로드)
const BG = [35, 36, 39, 255];
const LINE = [230, 230, 230, 255];
const ACCENT = [111, 184, 224, 255];
const CLEAR = [0, 0, 0, 0];
function pixel(x, y) {
  const r = 0.2;
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return CLEAR;
  const lines = [[0.3, 0.38], [0.47, 0.44], [0.64, 0.32]];
  for (const [ly, w] of lines) if (y >= ly && y < ly + 0.08 && x >= 0.18 && x < 0.18 + w) return LINE;
  // 화살표: 머리(삼각형) + 기둥
  const ax = 0.76;
  if (y >= 0.42 && y <= 0.8 && Math.abs(x - ax) <= 0.045) return ACCENT;
  if (y >= 0.28 && y <= 0.46 && Math.abs(x - ax) <= (y - 0.28) * 0.8) return ACCENT;
  return BG;
}

const dir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(dir, { recursive: true });
const sizes = [16, 24, 32, 48, 64, 256];
const pngs = sizes.map((s) => png(s, pixel));
fs.writeFileSync(path.join(dir, 'icon.png'), pngs[sizes.indexOf(256)]);
fs.writeFileSync(path.join(dir, 'tray.png'), pngs[sizes.indexOf(32)]);

// ICO: 헤더 + 항목 표 + PNG 데이터
const header = Buffer.alloc(6); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e[0] = s >= 256 ? 0 : s; e[1] = s >= 256 ? 0 : s;
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
fs.writeFileSync(path.join(dir, 'icon.ico'), Buffer.concat([header, ...entries, ...pngs]));
console.log('아이콘 생성: assets/icon.png, assets/tray.png, assets/icon.ico');
