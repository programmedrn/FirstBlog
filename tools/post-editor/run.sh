#!/usr/bin/env bash
# 블로그 글 편집기 실행: 서버를 띄우고 브라우저를 연다. 이미 떠 있으면 브라우저만 연다.
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-4180}"
URL="http://localhost:${PORT}"
CHECK="http://127.0.0.1:${PORT}/api/config"   # localhost가 IPv6로 먼저 풀리면 멈출 수 있어 IPv4로 확인

# zsh/nvm 환경에서 bash로 실행돼도 node를 찾을 수 있게 한다.
if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi
command -v node >/dev/null 2>&1 || { echo "node를 찾을 수 없습니다. Node.js 18 이상을 설치하세요."; exit 1; }

open_browser() {
  [ -n "${NO_BROWSER:-}" ] && return 0   # 트레이 앱이 실행할 때는 자체 창을 쓴다
  if command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$URL" >/dev/null 2>&1 || true   # WSL → Windows 브라우저
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 &
  elif command -v open >/dev/null 2>&1; then open "$URL"
  else echo "브라우저에서 $URL 을 여세요."; fi
}

if curl -fs --max-time 2 "$CHECK" >/dev/null 2>&1; then
  echo "이미 실행 중입니다: $URL"
  open_browser
  exit 0
fi

( for _ in $(seq 1 50); do curl -fs --max-time 2 "$CHECK" >/dev/null 2>&1 && { open_browser; break; }; sleep 0.1; done ) &
echo "종료하려면 이 창에서 Ctrl+C"
PORT="$PORT" exec node server.js
