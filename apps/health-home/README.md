# Health Home

운동용 인터벌 타이머 + Deck of Pain 카드 운동 생성기 + 10x(10s/30s) 인터벌

기능별로 독립된 폴더(`home/`, `timer/`, `deck/`, `interval-10-30/`)로 구성된 **다중 페이지(MPA)** 정적 사이트입니다.
각 폴더는 자체 `index.html`을 가진 완결된 화면이라, 폴더 단위로 따로 배포할 수 있습니다.

## 실행 방법

순수 HTML/CSS/JS 정적 사이트이므로 **빌드 과정 없이** 정적 파일 서버만 있으면 됩니다.
ES Modules를 사용하므로 `file://` 직접 열기는 불가하고 **HTTP 서버가 필요**합니다.

```bash
cd /path/to/Health_Home
./run.sh
```

(내부적으로 `npm install` 후 `npm start`, 즉 `serve -l 3000 .` 실행)

접속:
- `http://localhost:3000/` → `home/`으로 자동 이동
- `http://localhost:3000/home/`
- `http://localhost:3000/timer/`
- `http://localhost:3000/deck/`
- `http://localhost:3000/interval-10-30/`

## 프로젝트 구조

```
Health_Home/
├── index.html                    ← 루트: home/ 으로 리다이렉트만 함
├── shared/                       ← 모든 기능이 참조하는 공통 코드
│   ├── css/index.css             ← 디자인 시스템 (전체 공용)
│   ├── js/utils/dom.js           ← DOM 헬퍼
│   ├── js/utils/state.js         ← 상태 관리
│   ├── js/components/audio.js    ← 비프음 재생
│   └── assets/beep.mp3, beep2.mp3
├── home/                         ← [기능] 홈 네비게이션
│   ├── index.html
│   └── js/home.js
├── timer/                        ← [기능] 인터벌 타이머 (자유 구간 설정)
│   ├── index.html
│   └── js/timer.js
├── deck/                         ← [기능] Deck of Pain
│   ├── index.html
│   └── js/deck.js
├── interval-10-30/               ← [기능] 준비 10s / 운동 30s × 10세트
│   ├── index.html
│   └── js/interval1030.js
└── Origin/                       ← 원본 프로토타입 (서비스에 불필요, 배포 제외)
```

각 기능 폴더는 `../shared/`를 상대 경로로 참조합니다. **기능 폴더 하나만 배포하려면
`shared/` 폴더도 같은 상대 위치(`../shared/`)에 함께 올려야 합니다** — 예를 들어 `timer/`만
호스팅한다면 그 옆에 `shared/`도 나란히 배치하세요.

## 배포 예시

- **한 서버, 경로별 배포(권장)**: 저장소 전체를 그대로 정적 호스팅에 올리면
  `/home/`, `/timer/`, `/deck/`, `/interval-10-30/` 각각 독립된 URL로 접근 가능합니다.
  기능 하나만 바뀌었다면 그 폴더(+`shared/`)만 다시 업로드하면 됩니다.
- **안드로이드**: 배포된 `interval-10-30/` 같은 URL을 Chrome에서 열고
  "홈 화면에 추가"하면 해당 기능만 아이콘으로 바로 실행할 수 있습니다.

## 참고

- **백엔드/DB 없음** — 모든 상태는 클라이언트 메모리에서 관리
- **라우팅 없음** — 기능마다 실제 `index.html`이 있는 MPA 구조라 클라이언트 라우터가 필요 없습니다
- `Origin/` 폴더는 서비스에 필요 없으므로, 배포 시 제외해도 됩니다
