---
title: "Claude Skills 문서 읽기"
date: 2026-07-27
categories:
  - "docs"
  - "claude"
  - "skills"
excerpt: "Claude Skills 문서의 내용을 바탕으로 Claude가 기술을 인식하고 실행하는 방식을 학습합니다."
feature_text: |
  ## Claude Skills 문서 읽기
  Claude Skills 설정 및 작동 방식에 대한 내용 정리
feature_image:
---

https://code.claude.com/docs/en/skills#configure-skills  
여기 읽을 차례임

찾아본 바로는 claude가 켜질 때 skills 폴더, added-dir로 추가된 폴더 아래의 .claude/skills나 프로젝트 로컬의 같은 폴더, 혹은 ~/.claude/skills 아래 skill들을 읽은 다음 각각의 파일명에 따라 description 기반으로 역할을 이해한다고 한다. 그러다 skill파일의 변화도 감지하며 사용자 명령을 보고 어떤 skill을 쓸지 확인하여 invoke하고 invoke할 때는 context를 이어받거나 fork로 두어 새 session에서 작업을 하도록 진행할 수 있다. 특히 새 session에 매개변수를 줄 수 있으며 그 결과를 background로 invoke 시점에 실행되게 하거나 parent context가 종료되면 시행되게 하는 두 가지 방법을 고를 수 있다고 한다.

오늘 학습은 이보다 더 나가야 하는데 못 나갔다. 시간을 내일 더 써야겠다.
