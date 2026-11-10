@echo off
rem Windows에서 더블클릭으로 블로그 글 편집기를 실행한다(WSL 안의 저장소를 사용).
rem 바탕화면 등 원하는 곳에 복사해서 써도 된다. 창을 닫으면 편집기도 종료된다.
title Blog post editor
wsl.exe -d Ubuntu-24.04 --cd ~ -- bash -lc "~/code/githubPages/tools/post-editor/run.sh"
pause
