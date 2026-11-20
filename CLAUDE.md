# my-ipad-app 개발 원칙

개인 학업 통합 앱. PC·iPad는 웹앱(Cloudflare Pages, PWA 설치 가능), Android는 같은 빌드를 Capacitor로 패키징한 APK(디자인 승인 이후 단계).
스택: Vite + React + TypeScript + Tailwind CSS v4 + vite-plugin-pwa. 이 환경을 유지한다.

## 기준 문서 (docs/)
- `01_통합_기능_명세.md`, `02_설계_결정_추적표.md`(Q1–Q157)가 기능 규칙의 기준. 문서 없이 추정해 기능을 정하지 않는다.
- `03_Claude_Code_개발_계획.md`의 단계·검증 게이트를 따른다. 현재: **1단계(UI·디자인) 구현 완료, 사용자 디자인 확인 대기**. 승인 전에는 DB·인증·동기화를 연결하지 않는다.

## 원칙
- iPad 가로·세로 화면과 터치 조작에 최적화한다 (터치 영역 44px 이상, 안전 영역 `env(safe-area-inset-*)` 반영, hover 의존 금지). 스마트폰 폭은 하단 탭, md(768px) 이상은 사이드바.
- 기존 기능을 불필요하게 삭제하지 않는다.
- 컴포넌트 단위로 코드를 분리한다 (`src/features/<화면>`, 공통 UI는 `src/components/ui`).
- 데이터는 기본적으로 IndexedDB(Dexie, dexie-react-hooks)에 저장한다 — 2단계에서 `src/data/repository.ts` 인터페이스 뒤에 구현.
- 신규 사용자는 0건에서 시작한다. 샘플 데이터는 `src/dev/fixtures.ts`(개발 모드 전용, 프로덕션 번들 제외)에만 둔다.
- 학습일·D-Day 계산은 `src/domain/time.ts`(Asia/Seoul, 05:00 경계)만 사용한다.
- 오프라인에서도 핵심 기능이 동작하도록 설계한다 (외부 네트워크 의존 금지, 서비스 워커 캐시 고려).
- 색상은 `src/index.css`의 디자인 토큰(`bg-surface`, `text-muted`, `bg-accent` 등)만 사용한다.
- 주요 작업 후 `npm run build`와 `npm run lint`로 오류를 검사한다.
- 불필요한 라이브러리는 설치하지 않는다.
- GitHub 업로드·외부 배포는 사용자가 요청할 때만 수행한다.
