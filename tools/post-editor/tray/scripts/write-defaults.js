// 빌드하는 WSL 환경(배포판 이름, 저장소 경로)을 앱 기본값으로 넣는다.
// 실행 후에는 %APPDATA%\블로그 글 편집기\config.json 으로 바꿀 수 있다.
const fs = require('fs');
const path = require('path');

const repo = path.resolve(__dirname, '..', '..', '..', '..');
const defaults = {
  distro: process.env.WSL_DISTRO_NAME || '',
  repo,
  port: 4180,
};
fs.writeFileSync(path.join(__dirname, '..', 'defaults.json'), JSON.stringify(defaults, null, 2) + '\n');
console.log('defaults.json:', defaults);
