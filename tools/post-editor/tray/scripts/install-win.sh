#!/usr/bin/env bash
# 트레이 앱을 빌드해 Windows 로컬 폴더(%LOCALAPPDATA%\Programs\BlogPostEditor)에 설치하고
# 바탕화면·시작 메뉴 바로가기를 만든다.
#  - 매번 압축을 푸는 단일 exe(portable)가 아니라 풀린 상태로 두므로 바로 켜진다.
#  - WSL에서 복사한 파일에는 "인터넷에서 받은 파일" 표시가 붙지 않아 SmartScreen 경고가 뜨지 않는다.
set -euo pipefail
cd "$(dirname "$0")/.."

win() { "$@" < /dev/null 2>/dev/null | tr -d '\r'; }   # Windows 명령은 stdin을 닫아야 멈추지 않는다
EXE=BlogPostEditor.exe
NAME="블로그 글 편집기"

LOCALAPPDATA_WIN=$(win cmd.exe /c "echo %LOCALAPPDATA%")
[ -n "$LOCALAPPDATA_WIN" ] || { echo "Windows의 LOCALAPPDATA 경로를 읽지 못했습니다."; exit 1; }
TARGET_WIN="$LOCALAPPDATA_WIN\\Programs\\BlogPostEditor"
TARGET=$(wslpath -u "$TARGET_WIN")

if win tasklist.exe /FI "IMAGENAME eq $EXE" | grep -qi "$EXE"; then
  echo "편집기가 실행 중입니다. 트레이 아이콘 → 종료 후 다시 실행하세요."
  exit 1
fi

echo "1/3 빌드"
node scripts/make-icons.js >/dev/null
node scripts/write-defaults.js >/dev/null
npx electron-builder --win dir >/dev/null

echo "2/3 설치: $TARGET_WIN"
mkdir -p "$TARGET"
rsync -a --delete release/win-unpacked/ "$TARGET/"

echo "3/3 바로가기 만들기 (바탕화면, 시작 메뉴)"
win powershell.exe -NoProfile -NonInteractive -Command "
  \$shell = New-Object -ComObject WScript.Shell
  foreach (\$dir in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
    \$lnk = \$shell.CreateShortcut((Join-Path \$dir '$NAME.lnk'))
    \$lnk.TargetPath = '$TARGET_WIN\\$EXE'
    \$lnk.WorkingDirectory = '$TARGET_WIN'
    \$lnk.IconLocation = '$TARGET_WIN\\$EXE,0'
    \$lnk.Description = '$NAME'
    \$lnk.Save()
  }" >/dev/null

echo "완료: 바탕화면이나 시작 메뉴의 '$NAME'으로 실행하세요."
