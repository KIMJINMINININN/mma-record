# MatLog — 격투기 트레이닝 저널

> **"오늘 매트에서 배운 걸, 날짜·종목·벨트·영상으로 남기고 언제든 복습한다."**

주짓수(기/노기)·레슬링·타격(무에타이/킥복싱/복싱)·MMA를 병행 수련하는 사람을 위한 **개인 훈련 일지**입니다.
노션 캘린더처럼 생긴 화면에서 날짜별 훈련을 기록하고, 내가 찍은 클립과 참고 유튜브 영상을 붙이고,
주의사항 메모를 남기고, 종목·벨트·태그·검색으로 다시 꺼내 봅니다.

핵심 통찰: 수련자에게 필요한 건 "기록"이 아니라 **복습 가능한 기록**이다.
즉, `날짜 × 종목 × 기술분류 × 벨트 × 영상 × 태그`가 한 곳에 묶여야 한다.

> 제품명은 아직 확정 전(가칭). 상세 정의는 [`docs/mma/PRD.md`](docs/mma/PRD.md)가 단일 진실 공급원(SSoT)입니다.

---

## 무엇을 기록하나

| 축 | 값 |
|----|----|
| **종목 (Discipline)** | 주짓수 기 `bjj_gi` · 노기 `bjj_nogi` · 레슬링 `wrestling` · 타격 `striking` · MMA `mma` |
| **세션** | 날짜별 훈련 (한 세션에 여러 종목 가능, N:M) |
| **기술 (Technique)** | 종목별 분류 체계에 맞는 기술 라이브러리 |
| **벨트/랭크** | 종목별로 따로 관리 (예: 주짓수 블루 + 레슬링 입문) |
| **미디어** | 내가 찍은 클립 + 참고 유튜브 영상 |
| **태그·검색** | 과거 기록을 빠르게 다시 찾기 |

---

## 모노레포 구성

pnpm workspace + [Turborepo](https://turbo.build/)로 관리되는 모노레포(`the-others`)입니다.

```
.
├── apps/
│   ├── web/                 # Next.js 16 웹 앱 (메인 UI · Supabase 백엔드)
│   └── mobile/              # Expo / React Native WebView 셸 (iOS · Android)
├── packages/
│   └── webview-protocol/    # 웹 ↔ 네이티브 메시지 타입 (양쪽이 공유)
└── docs/mma/                # PRD · Design · Develop · TodoList
```

| 패키지 | 이름 | 설명 |
|--------|------|------|
| `apps/web` | `@the-others/web` | Next.js 16 · React 19 · Supabase · TanStack Query · Zustand · Tailwind v4. [Feature-Sliced Design](https://feature-sliced.design/) 구조(`app` / `widgets` / `features` / `entities` / `shared`). |
| `apps/mobile` | `@the-others/mobile` | Expo · React Native · expo-router. 웹 앱을 WebView로 감싸고 인증 브릿지·버전 체크·오프라인 배너·앱 무결성(루팅/탈옥) 검사를 더한 네이티브 셸. |
| `packages/webview-protocol` | `@the-others/webview-protocol` | WebView ↔ Native 메시지 프로토콜의 TypeScript 타입 정의. 웹과 모바일이 동일한 타입을 import 하여 사용. |

---

## 시작하기

### 요구 사항

- **Node** `>= 20`
- **pnpm** `>= 10` (`packageManager`: `pnpm@10.33.0`)
- 웹 백엔드용 [Supabase CLI](https://supabase.com/docs/guides/cli) (로컬 DB · 타입 생성)

### 설치

```bash
pnpm install
```

### 환경 변수 (웹)

```bash
cp apps/web/.env.example apps/web/.env.local
```

`.env.local`에 Supabase 키(신규 형식 `sb_publishable_*` / `sb_secret_*`), YouTube Data API 키,
업로드 한도 등을 채웁니다. 자세한 항목은 [`apps/web/.env.example`](apps/web/.env.example) 참고.

### 개발 서버

```bash
# 모든 워크스페이스 (turbo)
pnpm dev

# 웹만
pnpm web dev            # http://localhost:3000

# 모바일 (Expo)
pnpm mobile start       # 또는 ios / android
```

---

## 자주 쓰는 스크립트

### 루트 (Turborepo로 전체 워크스페이스 실행)

| 명령 | 설명 |
|------|------|
| `pnpm dev` | 전체 dev 서버 |
| `pnpm build` | 전체 빌드 |
| `pnpm lint` | 전체 린트 |
| `pnpm typecheck` | 전체 타입 체크 |
| `pnpm web <script>` | `@the-others/web` 워크스페이스에 위임 |
| `pnpm mobile <script>` | `@the-others/mobile` 워크스페이스에 위임 |

### 웹 — Supabase 데이터베이스

```bash
pnpm web db:start       # 로컬 Supabase 기동
pnpm web db:push        # 마이그레이션을 연결된 프로젝트에 반영
pnpm web db:types       # DB → TypeScript 타입 생성
pnpm web db:reset       # 로컬 DB 리셋
pnpm web db:diff -f <name>  # 스키마 변경 마이그레이션 생성
```

### 모바일 — 환경별 실행

`develop` / `beta` / `production` 환경을 지원합니다.

```bash
pnpm mobile start:dev   # 개발 환경으로 Expo 시작
pnpm mobile ios:beta    # 베타 환경 iOS 빌드/실행
pnpm mobile android:prod
```

---

## 기술 스택

- **웹**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, TanStack Query, Zustand, Zod, Supabase(SSR), dayjs
- **모바일**: Expo 54, React Native 0.81, expo-router, react-native-webview, jail-monkey / Google Play Integrity(앱 무결성)
- **공유**: `@the-others/webview-protocol` (WebView 메시지 타입)
- **툴링**: pnpm workspace, Turborepo, ESLint, Lefthook(git hooks), Gitleaks

---

## 문서

| 문서 | 내용 |
|------|------|
| [`docs/mma/PRD.md`](docs/mma/PRD.md) | 제품 정의 · 도메인 용어집 · 기능 (SSoT) |
| [`docs/mma/Design.md`](docs/mma/Design.md) | 화면·UX 설계 |
| [`docs/mma/Develop.md`](docs/mma/Develop.md) | 기술·아키텍처 설계 |
| [`docs/mma/TodoList.md`](docs/mma/TodoList.md) | 작업 목록 |

각 앱별 세부 안내는 [`apps/web/README.md`](apps/web/README.md), [`apps/mobile/README.md`](apps/mobile/README.md)를 참고하세요.
