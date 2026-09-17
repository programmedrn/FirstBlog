---
title: "Claude Code 정리"
date: 2026-08-06
categories:
  - "공부"
  - "정리"
  - "Claude"
excerpt: "Claude Code의 주요 기능인 skill, hook, agent, unix, routine, dispatch와 일반적인 워크플로우 및 subagent 활용법을 정리한 내용입니다."
feature_text: |
  ## Claude Code 정리
  Claude Code의 핵심 기능과 subagent 활용 가이드
feature_image:
---

## 기능(https://code.claude.com/docs/ko/overview)
- **skill**: 반복 가능한 워크플로우 패키징. review나 deploy 등
- **hook**: 작업 전후에 셸 명령 실행. lint 등
- **agent**: lead agent와 하위 agent를 나누어 작업 수행 가능
- **unix**: UNIX 작업 철학을 따르기 때문에 argument를 cli에서 | 를 통해 입력받을 수 있음
- **routine**: anthropic 관리 infra에서 실행되어 컴퓨터가 꺼져있어도 작업됨. API호출 또는 github event 에서도 트리거 가능. /schedule 사용
- **dispatch**: 휴대폰 앱과 데스크톱의 동일한 context 유지

## 일반적인 워크프롤우(https://code.claude.com/docs/ko/common-workflows)
코드 읽기> 버그 수정 > 리팩토링 > 테스트 의 작업 과정  
  설명이 꽤 긴데 결과적으로 각 과정에 대한 insgiht나 recommendation을 AI에게 요청하고 그 결과를 토대로 다시 명령하는 과정을 권장하고 있다. 또한 worktree로 격리된 병렬 세션(별도의 터미널)에서 작업을 수행하거나 background agent로 동일 화면에서 세션을 모니터링 하기도 한다.  
실행할 때 --plan으로 실행하면 계획만 하고 편집은 수행하지 않는다고 한다.  
또 메인 context가 파일 읽기로 채워질 위험이 있으니 subagent를 통해 파일을 읽고 결과만 받아보도록 요청할 수도 있다. 요청을 위한 요청을 수행하는 것을 권장하는 듯.  
잘 쓰려면 한 명의 전용 직원이 아니라 하나의 팀을 운영한다는 마음가짐이 필요할 듯하다.

## Subagent(https://code.claude.com/docs/ko/sub-agents)
subagent는 자체 컨텍스트 윈도우에서 실행되고 작업 결과를 요약해서 다시 전달한다. 이 때 독립된 context와 권한을 가진다. 특히 반복적인 작업이 발생하는 경우 사용자는 customized subagent를 정의할 수 있다. 이 설명과 일치하는 작업을 만나면 (.claude/agents 참조) 자체적으로 subagent를 생성한다. 순환참조를 막는 규칙은 없으며 다만 생성 깊이에 제한이 걸릴 수 있다.
```json
// .claude/settings.json
{
  "env": {
    "CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH": "1"
  }
}
```
또한 agent 자체에 하위 agent 생성을 통제(disallowedTools: Agent)할 수 있으며 세션당 동시 실행, 총 스폰 개수가 정해져 있어 한도에 도달하면 claude는 직접 처리하라는 요약을 전달 받는다. Claude에 물어본 결과 sendMessage라는 또 다른 위험이 존재한다고 하는데 agent간에 sendMessage를 호출하면 새 agent가 생성되지 않아도 자기들끼리 재개된다는 것이다. 메시징 루프에 대해서는 agent 정의에서 maxTurns를 사용하면 좋다고 한다.  
잘 관리한다면 도구 제한, 재사용성, 동작 특화, 비용 제어(model 분리)를 관리하기 좋은 도구이다.  
별도로 지정하지 않아도 자동으로 사용되는 subagent로는 **explorer**와 **plan**이 있는데 둘 모두 읽기 전용 도구이며 이름 그대로의 목적을 가지므로 요금 감소를 위해 부모의 claude.md나 git 상태는 고려하지 않는다고 한다. 다만 model 과 권한은 부모 세션을 상속받는다. 이외에도 기본적으로 사용되는 내장 subagent가 있는데 사용을 거부하려면 Agent에 대한 권한 자체, 혹은 특정 subagent를 거부해야 한다.  
subagent의 생성 자체를 claude에게 요청해도 된다.  
claude를 실행할 때 argument로 --agent를 통해 json을 넘겨도 된다. 이 경우 현재 프로젝트 내 .claude/agents/보다 우선한다. 우선순위는 가까운 데서부터(cli 명령줄) 먼데까지(claude 전역 설정 > plugin). **관리되는 설정**에 있는 값이 가장 우선한다.  
yaml frontmatter에 많은 설정 값이 있으니 참조.(https://code.claude.com/docs/ko/sub-agents#supported-frontmatter-fields)  
  subagent는 기본적으로 새 컨텍스트를 생성하나 기존 작업을 인수하게 하려면 작업 재개를 사용하면 된다. 이게 앞서 말한 sendMessage의 경우인데 claude에게 그냥 subagent 재개하라고 명령하면 된다. 특히 현재 context를 상속받게 하려면 /fork를 쓰면 된다. 예시로는 테스트 코드 작성. fork는 메인 터미널 입력창 아래에 나타나며 주 세션에서 오가며 제어할 수 있다.  https://code.claude.com/docs/ko/sub-agents#observe-and-steer-running-forks

## Claude가 프로젝트를 기억하는 법(https://code.claude.com/docs/ko/memory)

## Github Actions(https://code.claude.com/docs/ko/github-actions)

## MCP 서버 연결(https://code.claude.com/docs/ko/mcp-quickstart)
