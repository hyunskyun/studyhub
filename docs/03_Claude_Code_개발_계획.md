# 학업 통합 학습 앱 — Claude Code 개발 계획 (웹앱 + Android APK)

- 최종 확정된 개발 순서: **157A — 전체 화면·디자인을 먼저 완성한 후 실제 기능 연결**.
- 추가 플랫폼 요청: PC·iPad **웹앱**, Android **Capacitor 기반 APK**. 기존 React 프런트엔드 공통 사용. 상세 `05_플랫폼별_배포_전략.md`.
- 필수 입력 문서: `01_통합_기능_명세.md`, `02_설계_결정_추적표.md`.
- Claude Code는 사용자가 실제로 작업 중인 저장소를 먼저 검사해야 하며, 이 문서에 적힌 과거 경로/패키지를 검증 없이 단정하지 않는다.

## 운영 원칙

1. 기존 React/Vite/TypeScript 프로젝트를 가급적 유지한다. 새로운 저장소나 프레임워크로 갈아엎지 않는다. **Android 앱은 별도 React/React Native 프로젝트를 새로 만드는 대신 Capacitor로 공통 프런트엔드를 패키징한다.**
2. 모든 단계를 완료할 때마다 변경 파일, 실행/검사 명령, 통과/실패 결과를 요약한다. 실패를 성공이라고 보고하지 않는다.
3. UI 우선 단계에서는 **실제 D1/Google OAuth/Drive API 호출을 구현하지 않는다**. 먼저 **모든 주요 화면, 상태, 반응형 상호작용**을 완성하고 디자인 검수를 받는다.
4. '화면만 그리기'를 해도 추후 연결이 가능하도록 UI 데이터 타입과 서비스 인터페이스, 라우트 계약은 유지한다. mock repository와 fixture를 별도 디렉터리로 분리한다.
5. 새 사용자의 실제 데이터는 **0건**이어야 한다. 임시 샘플 데이터는 개발용 미리보기/테스트에서만 사용한다.
6. 일관성을 위해 식별자 기반 관계를 사용한다. 삭제/휴지통 복원/과목명 변경/Drive 파일 교체에도 관계가 무너지지 않게 한다.
7. 실제 사용자가 허락하기 전에는 운영 DB 변경, 원격 배포, OAuth 설정·권한 변경, 대량 삭제 같은 외부 작업을 하지 않는다.

## 단계 0 — 기존 프로젝트 현황 검사

### 작업
- `pwd`, `git status`, `package.json`, 폴더 구조, `vite.config.*`, `tsconfig.*`, Tailwind/PWA 관련 설정, 라우팅/상태 관리, 현재 화면/코드 확인.
- Windows 개발 환경의 Node/Java/Android Studio/Android SDK 사용 가능 상태와 Capacitor 버전 호환성은 **사용 전 확인**. UI 디자인 단계에서 Android 빌드 툴을 무조건 설치하거나 외부 설정을 변경하지 않음.
- 이미 있는 컴포넌트·테마·API/DB 계층을 식별하고 무리하게 재설치하지 않음.
- 기존에 설정된 개발 명령과 빌드/검사 명령 실행; 오류가 있다면 작업 전 기준선으로 기록.
- `docs/`의 통합 명세·결정 추적표를 읽고 사용자 결정에 반하는 기존 코드를 목록화.

### 완료 기준
- 현재 프로젝트 스택·실행 명령·이미 구현된 영역·미구현 영역·위험요소를 간단한 표로 제출.
- 변경 범위를 UI 중심으로 제한한 1차 작업 순서 확정.

## 단계 1 — 디자인 시스템과 전체 화면 (최우선, 157A)

### 1A. 디자인 토큰·내비게이션
- 미니멀 디자인; 라이트·다크·시스템 연동, 색상·타이포·간격·그리드·상태·접근성 기준 정리.
- 스마트폰 하단 내비게이션; iPad·PC 사이드바. 모바일 탭이 많을 경우 `더보기`로 기능 접근 보존.
- 캘린더 기본 **일간 보기**. 반응형 격자·스크롤·터치 타깃·키보드 포커스 일관성.
- 재사용 컴포넌트: 페이지 헤더, 탭/필터, 카드, 표, 모달, 확인창, 시간 선택, 태그, 교재 Part 트리, 차트, 입력 검증 메시지, 빈 상태, 휴지통/보관함 행.

### 1B. UI 전 화면
아래 화면을 **실제 서버 연결 없이** 모두 제작한다.

1. 홈: 학습일(05:00), 오늘 일정, 시험·수행평가 우선순위, 목표, 타이머 요약.
2. 일간 캘린더: 시간 블록, 일정, 학교/학원 수업 표시, 블록 드래그 편집 UI 및 충돌 표시.
3. 할 일: 우선순위, 하위 체크리스트, Part 연결, 완료 항목 접기, 마감일 없는 작업.
4. 타이머/공부 기록: 과목 전환 확인, 공부/휴식, 계획 연동, 잠금 후 재확인, 기기 이전 확인, 기록 충돌 편집 UI.
5. 문제집: 중단원·Part 트리, 개수 자동 생성, 붙여넣기 입력, 일괄 체크, 진행률.
6. 모의고사: 시험 목록·시도별 성적, 오답 입력·완료 확인, 문항 비교, 성적 추이 지표 선택.
7. 학교 지필 시험: 시험 목록·성적·범위·연결 문제집 진행률.
8. 수행평가 프로젝트: 세부 단계·연결 할 일·제출 여부·총점/획득점수.
9. 학원: 강좌, 정기 수업, 출석·수업 실제 시간, 휴강/보강, 숙제 템플릿·주간 묶음.
10. 목표·통계: 전체/과목별 목표, 자습만 시간 목표 집계, 학원/자습 통계 선택, 그래프와 필터.
11. Google Drive 자료: 연결 목록, 파일 상세, 접근 불가 상태; 시험 기록에서는 파일 연결 UI 제거.
12. 학교 시간표: 현재 1개 시간표 편집·표시.
13. 통합 검색: 이름 중심 검색 + 보관 기록 포함 옵션.
14. 보관함·휴지통: 보관 기록 수정, 30일 보존, 복원·충돌 처리.
15. 설정·사용자 로그인/Drive 별도 권한 화면 + JSON/CSV 내보내기·복원 안내.

### 1C. 상태·상호작용 프로토타입
- 실제 데이터 0건 **빈 상태**를 각 화면 기본으로 표시.
- 개발 전용 fixture 모드에서만 예시를 렌더링해 목록·카드·그래프·복잡한 모달을 검수할 수 있게 함.
- 메뉴 이동, 모달 열기/닫기, 탭 전환, 폼 유효성 시각 표시, 드래그 시각화 등 **UI 프로토타입 상호작용** 구현.
- API/로그인/DB/타이머 동기화/Drive 연동은 이 단계에서 실구현하지 않음. 화면에서 '연결 예정'이라는 허위 성공을 보여주지 않음.

### 1D. 디자인 검수
- 최소 세 뷰포트: 스마트폰 390×844, 태블릿 834×1112, 데스크톱 1440×900(예시 기준).
- 가능하면 Playwright 또는 기존 프로젝트 도구로 각 주요 화면 스크린샷과 반응형 확인.
- 라이트/다크, 데이터 없음/존재/오류, 긴 한국어 제목, 키보드 접근성, 대비 검토.
- 사용자에게 UI 검토 결과와 남은 UI 문제를 보고하고 **사용자가 디자인 완료를 확인하기 전에는 기능 연결 단계에 진입하지 않음**.

### 1C. Android APK 화면 검증 게이트 (기능 연결 전)
- 웹 전체 UI 완성 후 **공통 Vite 빌드 산출물**을 Capacitor Android 프로젝트에 반영한다. `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`는 현재 프로젝트·Node·Android SDK와 호환되는 버전으로 선정한다.
- `npm run build` → `npx cap sync android` → `npx cap open android` 순으로 개발용 Android APK를 빌드해 실기기에서 확인한다(초기 설정/플랫폼 생성은 별도 단계).
- Android 시스템 뒤로가기·하단 내비게이션·키보드·화면 잠금·회전·Safe Area·라이트/다크를 확인. 이 시점의 APK는 **UI 프로토타입**이며 Google 로그인·D1·Drive가 실제로 작동한다고 보고하지 않는다.
- PC/iPad 웹 UI와 Android APK UI 간 공통 컴포넌트·반응형 브레이크포인트를 유지하고 Android 특수 처리는 작은 어댑터에서만 수행한다.

## 단계 2 — 공통 데이터 모델 및 로컬 동작

- UI 구조에 맞춰 TypeScript 엔터티/관계 타입 확정. IndexedDB/Dexie 로컬 저장소 및 안정적 UUID.
- `user_id`, 생성/수정 정보, 삭제·보관 여부, 동기화 버전/작업 ID 등 서버 연동용 필드 설계.
- UI의 mock repository를 실제 로컬 repository로 교체; 로컬 CRUD 및 주요 계산 테스트.
- 선행 우선순위: 과목 → 할 일·하위 작업 → 문제집·Part → 일정/블록 → 공부 기록·타이머 → 수행평가/시험/학원/목표.
- 오프라인 실제 사용은 이 단계에서 구현하되 서버 동기화는 다음 단계.
- 05:00 `Asia/Seoul` 날짜 귀속, Part 자동완료 규칙, 타이머 시간 충돌 검사 등 **순수 함수 테스트** 먼저 작성.

## 단계 3 — Cloudflare 인증·D1 및 동기화

- 사용자 계정 인증: **PC/iPad 웹과 Android APK의 Google 로그인 진입점을 구분**한다. Android는 Google이 제한하는 삽입형 WebView OAuth를 사용하지 않고, 지원되는 네이티브 Google 로그인 또는 시스템 브라우저 Custom Tabs + 안전한 리디렉션을 사용. 플랫폼별 OAuth 클라이언트/리디렉션과 서버 토큰 검증을 통합해 동일 사용자 ID로 연결한다. Google Drive 권한은 별도 동의.
- Android 앱의 WebView origin과 웹 origin이 다를 수 있으므로 CORS·CSRF·쿠키/세션·브라우저 저장소 정책을 각각 검증한다. 인증 비밀은 앱 번들에 포함하지 않는다.
- Cloudflare Pages Functions/D1 바인딩을 저장소 현재 구성과 맞게 배치, 마이그레이션/백업/환경별 설정.
- 사용자별 접근 통제, 안전한 CRUD API, 서버 검증, 기록 ID·버전 관리.
- 로컬 변경 큐, 재전송 시 중복 생성 방지(idempotency), 서버 기준 버전 비교, 네트워크 오류 재시도.
- 필드별 독립 수정 병합, 동일 필드 충돌 UI, 휴지통/복원/삭제의 참조 무결성 유지.
- 계정당 타이머 1개 소유권, 기기 이전 확인, 오프라인 충돌 후보 보존 및 해결.
- 정상 상황 상시 동기화 상태 표시 없음(Q109), 충돌/실패에 대해서는 명확한 인터랙션 제공.

## 단계 4 — 고급 도메인 규칙 연결

- 시험·오답 비교, 목표·통계·차트, 학원 정기 숙제 템플릿 및 미래 필드별 병합, 수업 예외·마감 변경.
- 학교 시험 범위와 여러 교재의 Part 연결, 새로운 Part 추가 시 범위 확인.
- 프로젝트 세부 단계↔일반 할 일 양방향 완료·마감 동기화.
- 임의 삭제·복원·영구 삭제 시 연결·과거 이름 스냅샷 검증.
- 데이터가 없는 신규 계정도 복잡한 기능 없이 사용 시작 가능해야 함.

## 단계 5 — Google Drive 파일 연결 및 백업/복원

- Google 로그인과 독립적인 최소 Drive OAuth 권한. 지원 가능 범위에서 Picker로 선택한 파일만 등록하고 메타데이터 갱신.
- 권한 해제/파일 삭제·이동 등 접근 불가 시 링크 보존 + 접근 불가 표시.
- Drive 원본 삭제 금지. 파일 연결 정보만 휴지통/복원.
- JSON 전체 내보내기→검증→기존 데이터 안전 백업→전체 대체 복원. 파일 ID/관계/버전 복원 검증.
- CSV 전체 학습 기록·통계 내보내기; 일시·시각 표기와 UTF-8 BOM/Excel 호환성 검토.

## 단계 6 — 전 기능 QA·배포 준비

- 단위 테스트: 05:00 날짜·D-Day·date-only overdue, 시간 겹침, 과목 전환, 자동완료, 학원 템플릿 병합, 오답 목록 확정, 복원.
- 통합 테스트: 오프라인→온라인 재연결, 두 기기 충돌, Google 계정 권한, 휴지통, 데이터 백업 복원.
- E2E: **Windows 웹브라우저 + iPad Safari 웹앱/PWA + Android 설치형 APK**에서 입력·수정·오프라인 복구·동기화. Android 브라우저 테스트는 APK 테스트의 대체가 아니다.
- Android APK: debug APK 설치·실행/재실행·시스템 뒤로가기·오프라인 로컬 데이터·Google 로그인 외부 인증 흐름·Drive 접근·기기 간 타이머 이전을 실기기에서 검증. 배포용 서명 APK는 keystore 비밀을 안전하게 보관하고 debug APK와 구분한다.
- 보안: ID 토큰 검증, CSRF/세션, D1 테넌트 분리, 최소 OAuth scope, 비밀키 노출, XSS 입력 처리.
- 성능: 긴 할 일 목록, 수년간 공부 기록, Part 일괄 처리, 그래프 장기 데이터.
- 기존 `npm run build` 및 검증 스크립트가 프로젝트에 존재하면 실행, 미존재 명령은 추가 전에 확인.
- 원격 배포/프로덕션 데이터 쓰기는 최종 확인 이후에만 진행.

## 검증 게이트(다음 단계 진행 기준)

| 게이트 | 통과 기준 | 실패 시 |
|---|---|---|
| G0 저장소 실사 | 현재 코드·명령·기존 기능 목록 명확 | 기존 코드 수정 보류 |
| G1 디자인 | 전체 화면·반응형·빈 상태·테마·내비게이션 구현 + 사용자 디자인 확인 | 기능 연결 보류 |
| G2 로컬 규칙 | 핵심 데이터 관계와 테스트 통과 | API 연결 보류 |
| G3 인증·동기화 | 안전한 계정 분리·오프라인 충돌 테스트 | Drive/배포 보류 |
| G4 기능 통합 | 도메인 간 완료·삭제·통계 계산 테스트 통과 | 릴리스 보류 |
| G5 백업·Drive | 원본 무삭제/권한 재검증/JSON 안전 복원 | 릴리스 보류 |
| G6 배포 | Windows·iPad 웹앱과 Android 설치형 APK 다기기 E2E·보안·인증·오프라인 검증 완료 | 운영 배포 및 APK 릴리스 보류 |

## 데이터 모델 초안(참고용; UI 단계에서는 실제 DB 구현 금지)

- `users`, `auth_sessions`, `subjects`, `subject_tags`
- `time_blocks`, `calendar_events`, `recurrence_rules`, `recurrence_exceptions`, `school_timetable`
- `todos`, `subtasks`, `todo_workbook_part_links`
- `workbooks`, `workbook_units`, `workbook_parts`, `workbook_activity_links`
- `study_sessions`, `study_segments`, `study_breaks`, `timer_ownership`, `timer_conflict_candidates`
- `performance_projects`, `performance_steps`, `performance_todo_links`
- `school_written_exams`, `exam_scope_parts`
- `mock_exams`, `mock_attempts`, `mock_attempt_scores`, `mock_questions`, `error_categories`
- `academies`, `academy_courses`, `academy_classes`, `academy_attendance`, `academy_homework_templates`, `academy_homework_weeks`, `academy_homework_items`, `template_field_overrides`
- `goals`, `archives`, `trash_records`, `file_links`, `drive_file_metadata`, `sync_operations`, `sync_conflicts`

실제 테이블 분해 방식, 관계형 모델, D1 인덱스, ID 전략, API 엔드포인트는 단계 2·3에서 기능 명세를 기준으로 정한다. 이 목록을 그대로 생성하라는 지시가 아님.

## 필수 참고 문서

- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/d1/reference/migrations/
- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/workspace/drive/picker/guides/overview
- https://vite-pwa-org.netlify.app/guide/register-service-worker
- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/android
- https://developers.google.com/identity/siwg/best-practices
