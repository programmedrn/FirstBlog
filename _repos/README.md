# _repos — Repos 메뉴에 올릴 저장소 목록

블로그 상단 **Repos** 메뉴(`/repos/`)에 보이는 목록입니다. 저장소 하나 = 이 폴더의 `.md` 파일 하나.
목록의 항목을 누르면 `link`로 바로 이동합니다(새 탭). 이 파일(README.md)은 앞머리가 없어서 목록에 나오지 않습니다.

## 추가하기

이 폴더에 아무 이름으로 `.md` 파일을 만들고 아래처럼 적습니다. 파일 이름은 사이트에 보이지 않으니 알아보기 쉽게만 지으면 됩니다(예: `notitalk.md`).

```markdown
---
title: NotiTalk
link: https://github.com/programmedrn/NotiTalk
description: 카카오톡으로 특정 친구에게 휴대폰 알림을 보내 주는 프로그램
tags: [Python, Android]
order: 2
---
```

| 항목 | 필수 | 설명 |
| --- | --- | --- |
| `title` | ✔ | 목록에 보이는 이름 |
| `link` | ✔ | 누르면 갈 주소. GitHub가 아니어도 됨(GitLab, 배포한 사이트 등). 이 블로그 안의 주소는 `/apps/health-home/timer/`처럼 `/FirstBlog` 없이 적으면 알아서 붙음. 오른쪽에 주소의 도메인이 작게 표시됨 |
| `description` |  | 한 줄 설명. 자세한 건 저장소 README에 맡기고 짧게 |
| `tags` |  | 사용 기술 등. `[Java, Spring]`처럼 대괄호 안에 쉼표로 |
| `order` |  | 순서. 작은 숫자가 위. 없으면 맨 아래에 제목순 |

- 앞머리(`---` 사이)만 있으면 됩니다. 아래에 본문을 써도 사이트에는 나오지 않습니다.
- 값에 `:`이나 `#`이 들어가면 따옴표로 감싸세요. 예: `description: "C#: 윈도우 창 감지"`
- 빼려면 파일을 지우면 됩니다. 잠깐 숨기려면 파일 이름을 `_`로 시작하게 바꿔도 됩니다(Jekyll이 무시함).

## 올리기

다른 파일처럼 커밋하고 push하면 몇 분 뒤 반영됩니다.

```bash
git add _repos && git commit -m "Repos: NotiTalk 추가" && git push
```

참고: 글 편집기(`tools/post-editor`)의 업로드 버튼은 `_posts`, `assets/insertedImg`, `pages`만 커밋하므로 `_repos`는 위처럼 직접 커밋합니다.
