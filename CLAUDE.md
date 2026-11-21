# studyhub 개발 원칙

개인 학업 통합 앱. PC·iPad는 웹앱(PWA 설치 가능), Android는 같은 빌드를 Capacitor로 패키징한 APK(나중 단계).
스택: Vite + React + TypeScript + Tailwind CSS v4 + vite-plugin-pwa, 서버는 Cloudflare Workers(정적 자산 + `/api/*`) + D1. 이 환경을 유지한다.

## 기준 문서 (docs/)
- `01_통합_기능_명세.md`, `02_설계_결정_추적표.md`(Q1–Q157)가 기능 규칙의 기준. 문서 없이 추정해 기능을 정하지 않는다.
- **`06_변경_결정_기록.md`가 앞선 문서보다 우선**: D1 직접 저장, Google 로그인 대신 개인 접근 키, Pages 대신 Workers, 오프라인 캐시는 추후.
- `03_Claude_Code_개발_계획.md`의 단계·검증 게이트를 참고한다.

## 데이터·서버
- 데이터 원본은 Cloudflare D1. 화면은 `src/data/actions.ts`의 동작만 호출하고, 동작은 변경 묶음(Batch)을 `/api/batch`로 보낸다.
- 시간 중복 등 도메인 규칙은 `src/domain/collections.ts`(클라이언트·Worker 공통)에서 서버도 다시 검사한다.
- 모든 API는 개인 접근 키(`ACCESS_KEY` 비밀값)로 보호한다. 키를 코드·Git·로그에 넣지 않는다. 로컬은 `.dev.vars`(Git 제외).
- 스키마 변경은 `migrations/`에 새 SQL 파일로 추가하고 `npm run db:migrate:local`로 적용. 바인딩을 바꾸면 `npm run cf-typegen`.
- 원격 D1 생성·마이그레이션·배포(`wrangler deploy`, `secret put`)는 사용자가 요청할 때만 한다.
- Android APK: `npm run android:sync` 후 `npm run android:apk` (JAVA_HOME은 Android Studio `jbr`). 플랫폼 차이는 `src/platform/`에서만 처리한다. API 주소는 `apiBase()`를 거친다.

## 원칙
- iPad 가로·세로 화면과 터치 조작에 최적화한다 (버튼·입력·체크 영역 36px 이상, 사이드바 항목은 사용자 요청으로 32px, 안전 영역 `env(safe-area-inset-*)` 반영, hover 의존 금지). 스마트폰 폭은 하단 탭, md(768px) 이상은 사이드바.
- 디자인 방향(사용자 지정): Stripe 대시보드풍. 회청색 배경 위 흰 패널, 영역은 둥근 상자 대신 구분선으로 나눈다. 본문 14px·보조 13px, 지표 숫자는 강조색. 사이드바는 배경과 같은 면에 낮은 높이의 텍스트 메뉴.
- 기존 기능을 불필요하게 삭제하지 않는다.
- 컴포넌트 단위로 코드를 분리한다 (`src/features/<화면>`, 공통 UI는 `src/components/ui`).
- 신규 사용자는 0건에서 시작한다. 샘플 데이터는 `src/dev/fixtures.ts`(개발 모드 전용 메모리 저장소, 프로덕션 번들 제외)에만 둔다.
- 학습일·D-Day 계산은 `src/domain/time.ts`(Asia/Seoul, 05:00 경계)만 사용한다.
- 색상은 `src/index.css`의 디자인 토큰(`bg-surface`, `text-muted`, `bg-accent` 등)만 사용한다.
- 주요 작업 후 `npm run build`, `npm run lint`, `npm test`로 검사한다.
- 불필요한 라이브러리는 설치하지 않는다.
- GitHub 업로드·외부 배포는 사용자가 요청할 때만 수행한다.
