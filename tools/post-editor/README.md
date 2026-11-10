# post-editor — 블로그 글 편집기

`_posts`에 들어갈 글을 쓰고, 발행하고, GitHub에 올리는 로컬 웹 앱. Node만 있으면 되고 `npm install`은 필요 없다.

## 실행

```bash
tools/post-editor/run.sh          # WSL/리눅스. 서버를 띄우고 브라우저를 연다
```

Windows에서는 아래의 트레이 앱을 쓰는 게 편하다(`post-editor.bat`은 cmd 창이 떠 있는 간단한 대안).
주소는 http://localhost:4180 (`PORT=5000 tools/post-editor/run.sh`로 바꿀 수 있음). 종료는 창에서 Ctrl+C.

## Windows 트레이 앱

`tray/`는 cmd 창 없이 트레이에 상주하는 Windows 앱(Electron)이다. 실행하면 WSL 안에서 편집기 서버를 숨김 상태로 띄우고
편집기를 자체 창으로 연다. git·gh 인증은 WSL 쪽 것을 그대로 쓴다.

```bash
cd tools/post-editor/tray
npm install          # 처음 한 번
npm run install:win  # 빌드 → %LOCALAPPDATA%\Programs\BlogPostEditor 에 설치 → 바탕화면·시작 메뉴 바로가기
```

- 설치형으로 쓰는 이유: 단일 exe(portable)는 켤 때마다 100MB를 임시 폴더에 풀어서 느리고, `\\wsl.localhost\...`에서 실행하거나
  받은 파일이면 "게시자를 알 수 없음" 경고가 뜬다. `install:win`은 풀린 채로 로컬 폴더에 복사하므로 바로 켜지고 경고도 없다.
- 업데이트도 같은 명령. 실행 중이면 트레이에서 종료한 뒤 실행.
- 다른 PC에 들고 갈 단일 exe가 필요하면 `npm run dist:win` → `release/blog-post-editor.exe` (서명이 없어 경고가 뜸).
- 경고를 완전히 없애려면 코드 서명 인증서가 필요하다(유료). 내 PC에서만 쓰면 위 설치 방식으로 충분하다.

- 켤 때: exe가 압축을 푸는 동안 시작 그림(`tray/assets/splash.bmp`)이 뜨고, 이어서 창에 진행 단계와 경과 시간이 보인다.
  트레이 아이콘에 마우스를 올리면 툴팁으로도 상태가 나온다. 시작 그림은 `npm run splash`로 다시 만든다(문구·아이콘을 바꿀 때만).
- 창을 닫으면 트레이로 숨는다. 트레이 아이콘 클릭 → 창 열기.
- 트레이 메뉴: 편집기 열기 / 기본 브라우저로 열기 / 서버 다시 시작 / 설정 파일 열기 / Windows 시작 시 자동 실행 / 종료.
- **종료**하면 WSL 안의 편집기 서버도 함께 끈다. 저장 안 한 글이 있으면 먼저 물어본다.
  (이미 `run.sh`로 따로 띄운 서버를 쓰던 경우에는 그 서버는 건드리지 않는다.)
- 빌드할 때 이 PC의 WSL 배포판 이름과 저장소 경로가 기본값으로 들어간다. 바꾸려면 트레이 메뉴의 **설정 파일 열기**
  (`%APPDATA%\블로그 글 편집기\config.json`의 `distro`, `repo`, `port`)를 고친 뒤 **서버 다시 시작**.
- 서버 코드를 고친 경우 다시 설치할 필요는 없다(앱은 WSL 안의 서버를 실행할 뿐). `tray/` 안의 파일을 고쳤을 때만 `npm run install:win`.

## 흐름

| 버튼 | 하는 일 |
| --- | --- |
| **저장** (Ctrl+S) | 초안으로 저장. `tools/post-editor/drafts/`에 남고 git에는 안 올라감 |
| **저장 후 발행** | `_posts/YYYY-MM-DD-<번호>-<제목>.md`로 기록. 초안 이미지는 `assets/insertedImg/<글이름>/`로 옮겨지고 링크도 바뀜 |
| **⬆ 업로드** | `_posts`, `assets/insertedImg`, `pages`의 변경만 `git commit` 후 `git push origin HEAD` |

- 왼쪽 목록의 **발행됨**은 `_posts`의 글 전체. 누르면 렌더링된 화면, **수정**을 누르면 그 글의 초안이 생기고 다시 발행하면 덮어쓴다.
  제목이나 날짜를 바꾸면 파일 이름도 바뀌고(번호는 유지) 예전 파일은 지워진다.
- `업로드 전` 표시는 git에 아직 커밋되지 않은 글.
- 이미지·짧은 영상은 Ctrl+V, 끌어다 놓기, 🖼 버튼으로 넣는다. 1MB가 넘으면 경고한다. 긴 영상은 YouTube에 올리고
  `{% include video.html id="VIDEO_ID" %}`를 쓰자(미리보기에서도 보임).
- **줄바꿈 유지**를 켜 두면 편집창의 줄바꿈이 블로그에서도 줄바꿈이 된다(줄 끝에 공백 두 칸을 붙여 저장, 편집할 때는 다시 떼어서 보여줌).
  예전 영어 글처럼 공백 두 칸이 없던 글은 자동으로 꺼진 채 열린다.
- 본문의 `{{ }}`, `{% %}`는 Jekyll이 해석하지 않게 감싸서 저장한다. `{% include ... %}`와 `{{ site.xxx }}`는 그대로 둔다.
- 프런트매터 중 편집기가 모르는 줄(`# aside: true` 같은 주석 등)은 그대로 보존한다.

## HTML 페이지 올리기 (📄 HTML 버튼)

오프라인용으로 만든 HTML을 블로그에 올리고 글에서 링크로 연다.

1. 편집기 툴바의 **📄 HTML** → HTML 파일 경로 입력(트레이 앱은 **찾아보기…**나 끌어다 놓기도 됨).
   Windows 경로(`D:\...`), `\\wsl.localhost\...`, `/mnt/d/...` 모두 된다.
2. **가져와서 링크 넣기**를 누르면 `pages/<폴더>/`로 복사되고 커서 자리에 `[글자](/FirstBlog/pages/<폴더>/<파일>.html)` 링크가 들어간다.
3. 글을 발행하고 **⬆ 업로드**하면 블로그에서 `https://programmedrn.github.io/FirstBlog/pages/<폴더>/<파일>.html`로 열린다.

규칙:
- **폴더 이름**: 직접 적은 이름 → 없으면 HTML 파일 이름(파일이 `index.html`이면 그 폴더 이름). 소문자로 바꾸고 공백·기호는 `-`로.
  같은 원본을 다시 가져오면 같은 폴더를 새로 고치고, 다른 원본이 이름을 쓰고 있으면 `-2`, `-3`이 붙는다.
- HTML이 쓰는 로컬 파일(img·video·audio·source의 src·poster·srcset, CSS·JS, `<style>`과 CSS 파일 안의 `url()`·`@import`,
  같은 폴더 안 다른 HTML로 가는 `<a>` 링크)을 찾아 **같은 상대 위치로** 복사한다. 원본은 건드리지 않는다.
- 복사본의 링크를 고치는 경우는 셋뿐이다: HTML 폴더 밖의 파일(`external/`로 모음), `D:\...` 같은 절대 경로,
  Jekyll이 무시하는 이름(`_`·`.`·`#`로 시작 → 앞에 `x`를 붙임. 예: `_files` → `x_files`).
- 그래서 `pages/<폴더>/` 안의 HTML은 로컬에서 그냥 더블클릭해서 열어도 보인다.
- 스크립트가 실행 중에 불러오는 파일(fetch 등)은 찾을 수 없으니, 그럴 때는 **폴더 전체 복사**를 켠다(node_modules, .git은 뺀다).
- 사이트 루트 기준 경로(`/img/a.png`)와 없는 파일은 그대로 두고 결과에 "찾지 못한 파일"로 알려 준다.
- 100MB 가까운 파일은 GitHub가 받지 않아 빼고, 10MB 넘는 파일은 경고한다.
- 가져온 원본 경로 기록은 `drafts/pages.json`(로컬 전용)에 있다.

## push 인증

`gh auth login`이 돼 있으면 그 자격 증명을 쓴다. 아니면 git 설정의 credential helper를 쓰고, 비밀번호를 물어봐야 하는
상황이면 대기하지 않고 실패 메시지를 보여준다. 커밋은 됐는데 push만 실패했으면 다음 업로드 때 다시 push한다.
