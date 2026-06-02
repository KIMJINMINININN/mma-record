# Develop — MMA 트레이닝 저널 (기술/개발 계획)

> 제품: **MMA 트레이닝 저널** (가칭 **RollLog**) · 문서 버전 **v0.1 (Draft)** · 작성일 **2026-05-30**
> 본 문서는 [`PRD.md`](./PRD.md)(SSoT)를 구현으로 옮기는 **기술 계획서**입니다. 용어·기능 ID(F1..F11)·종목 코드(`bjj_gi`/`bjj_nogi`/`wrestling`/`striking`/`mma`)·분류(§4.2)·포지션(§4.4)·수업유형(§4.5)·벨트(§4.3)·엔티티(§8)는 **PRD를 그대로 인용**합니다. 충돌 시 PRD가 우선이며, PRD를 먼저 고친 뒤 본 문서를 갱신합니다.
>
> 기존 모노레포(`the-others`, 냉장고 앱)의 **Supabase/FSD/WebView/툴링 컨벤션을 그대로 미러링**합니다. 본 문서의 SQL/파일경로/메시지타입은 그 컨벤션을 따른 **실제 빌드 가능한** 초안입니다. 숫자가 미확정인 곳은 합리적 기본값 + **(확정 필요)** 로 표기합니다.

---

## 목차
1. [아키텍처 개요](#1-아키텍처-개요)
2. [기술 스택 & 버전](#2-기술-스택--버전)
3. [레포 부트스트랩](#3-레포-부트스트랩)
4. [Supabase 설계](#4-supabase-설계)
5. [스토리지 전략 (하이브리드)](#5-스토리지-전략-하이브리드)
6. [웹 (Next.js FSD) 레이어 설계](#6-웹-nextjs-fsd-레이어-설계)
6b. [데이터 패칭 & 상태](#6b-데이터-패칭--상태)
7. [YouTube 통합](#7-youtube-통합)
8. [검색 & 태그 구현](#8-검색--태그-구현)
9. [모바일 (Expo) 계획](#9-모바일-expo-계획)
10. [인증 플로우](#10-인증-플로우)
11. [테스트 & CI](#11-테스트--ci)
12. [마일스톤 & 시퀀싱](#12-마일스톤--시퀀싱)
13. [배포](#13-배포)
14. [오픈 기술 결정 / TODO](#14-오픈-기술-결정--todo)

---

## 1. 아키텍처 개요

**웹(Next.js)이 UI의 본체**, **모바일(Expo)은 그 웹앱을 띄우는 WebView 셸 + 네이티브 촬영/업로드 브릿지**. 데이터/인증/스토리지는 Supabase, 웹 호스팅은 Vercel.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                사용자 디바이스                                  │
│                                                                                │
│  ┌───────────── 데스크톱/태블릿 브라우저 ─────────────┐   ┌──── 모바일 (Expo SDK 54) ────┐ │
│  │  apps/web (Next.js 16 · React 19 · FSD)            │   │  apps/mobile (RN 0.81 셸)     │ │
│  │  · RSC + Route Handlers + Server Actions           │   │                              │ │
│  │  · TanStack Query + Zustand + Axios                │   │  ┌── (tabs)/web ──────────┐  │ │
│  │  · Tailwind v4 · react-calendar                    │   │  │ react-native-webview   │  │ │
│  └───────────────────────┬────────────────────────────┘   │  │  src={ENV.CLIENT_URL}  │◀─┼─┐│
│                          │ https                            │  └──────────┬─────────────┘  │ ││
│                          │                                  │   postMessage│ ↕ injectJS    │ ││
│                          │                                  │  ┌──────────▼─────────────┐  │ ││
│                          │                                  │  │ webview-protocol 브릿지│  │ ││
│                          │                                  │  │ AUTH_* + MEDIA_* (신규)│  │ ││
│                          │                                  │  └──────────┬─────────────┘  │ ││
│                          │                                  │   네이티브 핸들러            │ ││
│                          │                                  │  expo-camera/image-picker/   │ ││
│                          │                                  │  video · secure-store        │ ││
│                          │                                  └──────────┬───────────────────┘ ││
│                          │                                             │ (직접 업로드)        ││
└──────────────────────────┼─────────────────────────────────────────────┼───────────────────┼┘
                           │                                             │                   │
                           ▼  Vercel Edge/Node (apps/web)                │ signed PUT        │ 웹앱 정적/세션
              ┌────────────────────────────┐                            │                   │
              │  Next.js Route Handlers     │                            │                   │
              │  /api/media/sign-upload     │── signed URL ──────────────┘                   │
              │  /api/youtube/search (24h)  │                                                │
              │  /api/health                │                                                │
              │  Server Actions (auth/CRUD) │                                                │
              └─────────────┬───────────────┘                                                │
                           │ @supabase/ssr (anon=publishable) · admin(secret, RLS bypass)   │
                           ▼                                                                 │
┌──────────────────────────────────────── Supabase 프로젝트 ──────────────────────────────────┐│
│  Auth (이메일/소셜, JWT)   ◀──────────── 세션 쿠키(웹) / secure-store 토큰(모바일) ──────────┘│
│  Postgres  · profiles/user_ranks/sessions/session_disciplines/session_techniques            │
│            · techniques/media_assets/tags/taggables · RLS(auth.uid()=user_id) · pg_trgm RPC  │
│  Storage   · 비공개 버킷 `training-media` (user_id 경로 prefix, signed URL)                  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 요청/데이터 흐름

- **웹 읽기 (캘린더/기술/검색)**: RSC가 `createSupabaseServerClient()`(쿠키 기반 anon, RLS 적용)로 서버에서 1차 페치 → 클라이언트 컴포넌트가 TanStack Query로 갱신/뮤테이션. 미들웨어 `proxy.ts`가 매 요청 세션을 갱신.
- **웹 쓰기 (세션/기술 CRUD)**: Server Action 또는 브라우저 클라이언트(`createSupabaseBrowserClient()`)로 INSERT/UPDATE. 복합 삽입(세션+기술+태그)은 `log_session(...)` RPC 1콜로 원자 처리(냉장고 `log_cooking_session` 미러).
- **내 영상 업로드(웹)**: 브라우저 → `/api/media/sign-upload`(Route Handler, admin client)로 **서명 업로드 URL** 발급 → 브라우저가 Storage로 직접 PUT → 성공 시 `media_assets` row INSERT.
- **내 영상 업로드(모바일)**: WebView가 `MEDIA_PICK_REQUEST`/`MEDIA_CAPTURE_REQUEST`를 네이티브로 전송 → 네이티브가 카메라/갤러리로 파일 확보 → (a) `/api/media/sign-upload`에서 서명 URL 받아 네이티브가 직접 업로드, 또는 (b) secure-store 토큰으로 Storage SDK 직접 업로드 → `MEDIA_UPLOAD_RESULT`로 asset ref를 WebView에 반환 → 웹이 `media_assets` row 생성.
- **유튜브 참고영상**: 기존 `/api/youtube/search`(24h `youtube_cache`) 재사용. `media_assets.kind='youtube'` + `youtube_video_id` 저장.
- **재생**: 업로드 영상은 항상 **signed URL**(만료 짧게)로만 재생. 유튜브는 임베드, 외부는 링크.

---

## 2. 기술 스택 & 버전

현 모노레포에서 **확정된 버전**을 그대로 승계합니다. (괄호 = 출처/비고)

| 영역 | 기술 | 버전 | 비고 |
|---|---|---|---|
| 모노레포 | pnpm | **10.33.0** | `packageManager` 고정 |
| 모노레포 | Turborepo | ^2.3.3 | `turbo.json` tasks: build/dev/lint/typecheck |
| 모노레포 | Node | **≥20** | `engines` |
| 모노레포 | node-linker | **hoisted** | `.npmrc` — 변경 금지(Next 16 Turbopack + Expo 호환) |
| 웹 | Next.js | **16.2.4** | App Router. ⚠️ `apps/web/AGENTS.md`: "this is NOT the Next.js you know" — `node_modules/next/dist/docs/` 우선 확인 |
| 웹 | React / React DOM | **19.2.4** | |
| 웹 | TypeScript | ^6.0.3 | `strict`, `moduleResolution: bundler`, alias `@/* → ./src/*` |
| 웹 | Tailwind CSS | **v4** | `@tailwindcss/postcss`, `shared/styles/*` |
| 웹 | 상태/데이터 | TanStack Query ^5.100, Zustand ^5.0, Axios 1.15.2 | RSC + Query 혼용 |
| 웹 | Supabase 클라이언트 | `@supabase/ssr` ^0.10, `@supabase/supabase-js` ^2.104 | server/browser/admin |
| 웹 | 검증 | Zod ^4.4 | Server Action/RPC 입력 검증 |
| 웹 | UI 보조 | react-calendar ^6.0, react-datetime-picker ^7.0, @hello-pangea/dnd ^18, class-variance-authority ^0.7, sonner ^2.0(toast), @radix-ui/react-dialog ^1.1 | 캘린더 본체 = react-calendar 커스텀 |
| 웹 | 날짜 | dayjs ^1.11 | KST 보정 |
| 웹 | 보안 | dompurify ^3.4 | 마크다운 메모 렌더 sanitize |
| 모바일 | Expo SDK | **54** (`expo` ^54.0.33) | |
| 모바일 | React Native | **0.81.5** / React 19.1.0 | |
| 모바일 | 라우팅 | expo-router ^6.0 | `(tabs)` + stack |
| 모바일 | WebView | react-native-webview **13.15.0** | 셸 |
| 모바일 | **신규 미디어** | expo-camera, expo-image-picker, expo-video, expo-secure-store | **본 프로젝트에서 추가** (SDK 54 호환 버전) |
| 모바일 | 보안 | jail-monkey, react-native-google-play-integrity | 기존 모듈 재사용 |
| 공유 | webview-protocol | workspace `@the-others/webview-protocol` | 메시지 타입 단일 출처 — 본 프로젝트에서 `MEDIA_*` 확장 |
| 테스트 | Vitest ^4.1 + @testing-library/react, Playwright ^1.59 | | 단위 + e2e |
| 툴링 | lefthook ^2.1, gitleaks | | pre-commit: gitleaks `protect --staged` + `web typecheck` |
| BE/Infra | Supabase (Postgres + Auth + Storage), Vercel, Expo EAS | | 신규 프로젝트 |

> ⚠️ **Next 16 주의**: API/관례가 학습 데이터와 다를 수 있음. Route Handler/Server Action/`cookies()`/미들웨어(`proxy.ts`) 시그니처는 현 레포의 기존 파일을 패턴 소스로 삼는다.

---

## 3. 레포 부트스트랩

PRD 부록 A: **현 모노레포 구조를 템플릿으로 새 레포 생성**, 새 Supabase/Vercel 프로젝트. 냉장고 도메인 코드는 제거/치환.

### 3.1 유지 (그대로 가져옴)
- **모노레포 스캐폴딩**: `package.json`(root), `pnpm-workspace.yaml`(`apps/*`,`packages/*`), `.npmrc`(`node-linker=hoisted` — **건드리지 말 것**), `turbo.json`, `.gitignore`(루트), `.gitleaks.toml`, `lefthook.yml`.
- **`packages/webview-protocol`** 전체(메시지 envelope + AuthMessage). → §9에서 `MEDIA_*` 추가.
- **`apps/web` 골격**:
  - FSD 디렉터리(`src/app`,`src/entities`,`src/features`,`src/widgets`,`src/shared`)와 `shared/` 인프라(`shared/api/supabase/{server,client,admin,index,types}.ts`, `shared/styles/*`(Tailwind v4), `shared/config`, `shared/lib`, `shared/model`, `shared/ui`).
  - `shared/api/supabase/index.ts`의 export 4종(server/client/admin/Database) **그대로 유지**.
  - 인증 골격: `app/(auth)/{login,signup}` + `app/(auth)/actions.ts`(signup/login/logout Server Action) + 미들웨어 `src/proxy.ts`.
  - 재사용 기능: `features/youtube-embed/`(api/route-handler 포함) + `app/api/youtube/search/route.ts` + `app/api/health/route.ts`.
  - 설정: `next.config.ts`(`transpilePackages:['@the-others/webview-protocol']`, `turbopack.root`), `tsconfig.json`(alias `@/*`, mobile/dist exclude), `postcss.config.mjs`, `eslint.config.mjs`(next core-web-vitals), `vitest.config.ts`(+ `vitest.setup.ts`), `playwright.config.ts`(PORT=3100, `.env.test` 로드).
  - Supabase 로컬: `apps/web/supabase/config.toml`(api/db/storage/auth `enabled=true`), `db:*` 스크립트, `scripts/check-migration-drift.mjs`.
- **`apps/mobile` 골격**: `app/_layout.tsx`(security gate + version check), `app/(tabs)/{_layout,web}.tsx`, `components/screens/webview-screen.tsx`, `hooks/webview/*`(types/use-webview/use-webview-message + `handlers/*`), `config/env.ts`(CLIENT_URL per env), `utils/security/*`, `constants/theme.ts`.

### 3.2 제거 (냉장고 도메인 — replace)
| 종류 | 제거 대상 |
|---|---|
| Migrations | `apps/web/supabase/migrations/0002~0019` 전부(profiles/storage_locations/ingredient_*/recipes/cooking_history/shopping_list/recommend_*/search_ingredient_*/log_cooking_session). **`0001_init.sql`(`create extension pg_trgm`)만 유지.** |
| Seeds | `apps/web/supabase/seeds/recipes_*.csv`, `recipe_ingredients_*.csv`, `recipes_to_sql.mjs` |
| entities | `entities/{ingredient,recipe,cooking-history,shopping-item}/` 전체 |
| features | `features/{add-ingredient,consume-ingredient,delete-ingredient,move-ingredient,manage-storage,list-inventory,inventory-filter,dual-recommendation,list-recommendations,view-recipe-match,extract-recipe-gap,log-cooking-session,commerce-deeplink,manual-add-shopping,toggle-bought,delete-shopping-item}/` (※ `youtube-embed`만 유지) |
| widgets | `widgets/{inventory-list,recipe-detail,recipe-recommendations,cooking-history-list,shopping-list}/` (※ `app-shell`은 비우고 MMA 셸로 재작성) |
| app routes | `app/(app)/{inventory,recipes,cooking-history,shopping}/`, 냉장고 전용 page/loading |
| 모바일 | `app/(tabs)/{index,explore}.tsx`(Todo/Explore 데모 탭) — MMA에선 web 단일 탭 또는 네이티브 탭 재구성 |
| env | 이전 템플릿 전용 외부 연동 env 토글 제거 |

> 제거 후 `pnpm typecheck`가 깨지는 import는 새 MMA 엔티티/피처로 치환하며 점진 정리(§12 Phase 0~1).

### 3.3 환경변수 & 시크릿 정책 (기존 패턴 재사용)
- `.env.local`(dev, 원격 또는 로컬 supabase), `.env.test`(e2e, 로컬 supabase 키) → **둘 다 gitignore**(`apps/web/.gitignore`의 `.env*`). 커밋되는 건 `.env.example`만.
- 키는 **신규 형식만**: `sb_publishable_*`(브라우저/anon), `sb_secret_*`(서버 전용). legacy(`anon`/`service_role` JWT) 사용 금지.
- **gitleaks**: lefthook pre-commit `gitleaks protect --staged --no-banner`. `.gitleaks.toml` allowlist에 `docs/`·`pnpm-lock.yaml` 포함(현행 유지). GitHub **push protection ON** — `sb_secret_*` 리터럴 절대 커밋 금지(env로만 주입).
- `SUPABASE_SECRET_KEY`/`YOUTUBE_API_KEY`는 **서버(Route Handler/Server Action/admin client)에서만** 참조. `NEXT_PUBLIC_*`만 브라우저 노출.

### 3.4 `apps/web/.env.example` (새 앱)
```dotenv
# ───────── Supabase (Dashboard → Settings → API Keys) ─────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx

# ───────── YouTube Data API (서버 전용, 클라이언트 노출 금지) ─────────
YOUTUBE_API_KEY=xxx

# ───────── Storage (하이브리드 업로드 한도 — §5, 확정 필요) ─────────
NEXT_PUBLIC_UPLOAD_MAX_BYTES=104857600            # 100 MiB (확정 필요)
NEXT_PUBLIC_UPLOAD_MAX_DURATION_SEC=60            # 60s    (확정 필요)
NEXT_PUBLIC_MEDIA_BUCKET=training-media

# ───────── e2e (Playwright) — 로컬 supabase 전용. 실제 값은 .env.test(gitignore) ─────────
# `pnpm web db:start` 후 `supabase status` 출력값으로 .env.test 작성
E2E_SUPABASE_URL=http://127.0.0.1:54321
E2E_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
E2E_SUPABASE_SECRET_KEY=sb_secret_xxx
```

모바일 `apps/mobile/.env.{develop,beta,production}`은 기존 형식 유지하되 `CLIENT_URL`을 새 Vercel 도메인으로, 그리고 네이티브 직접 업로드용 키를 `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`로 추가(secret 키는 앱에 **절대** 넣지 않음 — anon만).

---

## 4. Supabase 설계

### 4.1 새 프로젝트 & `config.toml`
- 새 Supabase 프로젝트 생성 후 `supabase link --project-ref <ref>`. `config.toml`은 현행 템플릿 재사용:
  - `[api] enabled=true (port 54321)`, `[db] (54322)`, `[studio] (54323)`, `[inbucket] (54324)`.
  - `[auth] enabled=true`, `enable_signup=true`, `enable_confirmations`(MVP=false로 로컬 개발 간소화, 프로덕션은 true 권장 — **확정 필요**), `site_url`/`additional_redirect_urls`에 Vercel 도메인 추가.
  - `[storage] enabled=true`. 전역 `file_size_limit`을 **"100MiB"** 로 상향(현 50MiB) 후 버킷별로 더 강하게 제한(§5). 로컬 버킷 선언:
    ```toml
    [storage.buckets.training-media]
    public = false
    file_size_limit = "100MiB"          # (확정 필요)
    allowed_mime_types = ["video/mp4", "video/quicktime", "image/jpeg", "image/png", "image/webp"]
    objects_path = "./training-media"
    ```
  - `[db.seed] enabled=true` 유지(reset 시 seed). `[db.migrations] enabled=true`.

### 4.2 마이그레이션 계획 (`NNNN_descriptive.sql`, 순차)
냉장고 컨벤션과 동일: 한 파일 = 한 관심사, RLS 즉시 동반, 상수는 SQL inline + TS mirror 동치(변경 시 양쪽 동시 — PR 룰).

| # | 파일 | 내용 |
|---|---|---|
| 0001 | `0001_init.sql` | `create extension if not exists pg_trgm;` **(유지)** |
| 0002 | `0002_enums.sql` | 도메인 enum 전부 (§4.3 — discipline, technique_category(+`entry`), position_kind, class_type(+`seminar`), belt, media_kind, visibility, **`rank_track`**, **`striking_style`**) |
| 0003 | `0003_profiles.sql` | `profiles` + `handle_new_user()`(프로필 생성) + **공통 `set_updated_at()` 트리거 함수** |
| 0004 | `0004_user_ranks.sql` | `user_ranks`(**`rank_track`별** 벨트/레벨 — bjj 1행이 gi·nogi 공유) |
| 0005 | `0005_techniques.sql` | `techniques` 카탈로그(+**`striking_style`**) + pg_trgm 인덱스 |
| 0006 | `0006_sessions.sql` | `sessions` + `session_disciplines`(N:M) + 캘린더 날짜 인덱스 |
| 0007 | `0007_session_techniques.sql` | `session_techniques`(세션↔기술 N:M + 그날 메모) |
| 0008 | `0008_media_assets.sql` | `media_assets` + `media_links`(**듀얼 FK**: session_id/technique_id) |
| 0009 | `0009_tags_taggables.sql` | `tags` + `taggables`(**듀얼 FK**) + pg_trgm |
| 0010 | `0010_views.sql` | `calendar_day_summary` 뷰(security_invoker) |
| 0011 | `0011_youtube_cache.sql` | `youtube_cache`(냉장고와 동일 구조) |
| 0012 | `0012_search_all.sql` | `search_all(...)` 글로벌 검색 RPC(**auth.uid() 내부**) |
| 0013 | `0013_log_session.sql` | `log_session(...)` 원자 삽입 RPC(세션+종목+기술+태그+미디어) |
| 0014 | `0014_storage_policies.sql` | `storage.objects` RLS(버킷+user_id 경로) — §5 |
| 0015 | `0015_starter_techniques.sql` | **프리셋 기술 시드**: `seed_starter_techniques()` + `handle_new_user` 재정의(가입 시 본인 소유 복사) |

### 4.3 Enums (PRD §4 그대로)
```sql
-- 0002_enums.sql
create type discipline as enum ('bjj_gi', 'bjj_nogi', 'wrestling', 'striking', 'mma');

-- 그래플링+타격+mma 분류 합집합 (PRD §4.2). UI가 종목에 맞는 부분집합만 노출.
create type technique_category as enum (
  -- 그래플링
  'guard', 'pass', 'sweep', 'submission', 'takedown', 'escape',
  'transition', 'control', 'defense',
  -- 타격
  'punch', 'kick', 'knee', 'elbow', 'clinch', 'combination', 'footwork',
  -- 공통(그래플링/타격)
  'entry',
  -- mma 전용
  'cage_work', 'ground_and_pound'
);
-- 참고: 'defense'·'entry'는 그래플링/타격 공통(PRD §4.2) → 단일 값 재사용.

-- 주의: 'position'은 Postgres에서 타입/함수 이름으로 쓸 수 없는 키워드 범주
-- (non-reserved, cannot be function or type name) → 타입명은 position_kind 로.
-- 컬럼명 'position'은 사용 가능하므로 컬럼은 position 유지(아래 techniques 참고).
create type position_kind as enum (
  'standing', 'clinch', 'closed_guard', 'open_guard', 'half_guard',
  'mount', 'side_control', 'back_control', 'turtle', 'north_south',
  'knee_on_belly', 'other'
);

create type class_type as enum (
  'technique', 'drilling', 'sparring', 'open_mat', 'private', 'seminar', 'competition', 'strength'
);

create type belt as enum ('white', 'blue', 'purple', 'brown', 'black');
-- stripes(0~4)는 enum이 아니라 int 컬럼으로(검증은 check). PRD §4.3.

create type media_kind as enum ('upload', 'youtube', 'external');

-- 공유 대비 시드 (PRD §12). MVP RLS는 visibility를 강제하지 않음.
create type visibility as enum ('private', 'shared', 'public');

-- 타격 세부 스타일 (PRD §4.1, 사용자 결정). 타격 기술/세션에 선택 부여.
create type striking_style as enum ('muay_thai', 'kickboxing', 'boxing', 'other');

-- 사용자 랭크 트랙 (PRD F1, 벨트 통합 결정). bjj = gi+nogi 공유, 나머지는 level 사용.
create type rank_track as enum ('bjj', 'wrestling', 'striking', 'mma');
```

### 4.4 테이블 스키마 (PRD §8 엔티티별)

모든 사용자 소유 테이블 공통: `id uuid pk default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `visibility visibility not null default 'private'`, `created_at/updated_at timestamptz default now()`. RLS = `for all using (auth.uid()=user_id) with check (auth.uid()=user_id)` (냉장고 `user_ingredients` 패턴).

#### profiles + handle_new_user()
```sql
-- 0003_profiles.sql  (냉장고 user_profiles 패턴 미러)

-- 공통 updated_at 자동 갱신 함수 (모든 테이블의 updated_at 트리거가 재사용)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Asia/Seoul',
  visibility visibility not null default 'private',   -- 공유 대비 시드
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "profiles_select_own" on profiles for select using (auth.uid() = user_id);
create policy "profiles_update_own" on profiles for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- INSERT 정책 없음 → handle_new_user() (security definer)만 INSERT
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

create function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (user_id, display_name, timezone)
  values (new.id, '', 'Asia/Seoul')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row
  execute function public.handle_new_user();
-- 참고: handle_new_user는 0015에서 프리셋 기술 시드 호출까지 포함해 재정의됨.
```

#### user_ranks (종목별 벨트/레벨 — PRD F1/AC4)
```sql
-- 0004_user_ranks.sql
-- 벨트 통합 결정(사용자): 주짓수 벨트는 gi/nogi 공유 → discipline이 아니라 rank_track으로 키.
create table user_ranks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track rank_track not null,              -- bjj | wrestling | striking | mma
  belt belt,                              -- bjj 트랙만(gi·nogi 공유). 그 외 null.
  stripes int check (stripes between 0 and 4),
  level text,                             -- 비bjj 트랙 '입문/중급/고급'(선택). PRD §4.3
  visibility visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, track)                 -- 트랙당 1 랭크 (bjj 1행이 gi+nogi 커버)
);
create index user_ranks_user_idx on user_ranks(user_id);

alter table user_ranks enable row level security;
create policy "user_ranks_owns_rows" on user_ranks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger user_ranks_set_updated_at before update on user_ranks
  for each row execute function set_updated_at();
-- discipline→track 매핑(entities/discipline lib): bjj_gi,bjj_nogi→bjj / wrestling,striking,mma→동일.
```

#### techniques (기술 카탈로그 — PRD F4)
```sql
-- 0005_techniques.sql
create table techniques (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  discipline discipline not null,
  category technique_category not null,
  position position_kind,                 -- 컬럼명 position / 타입 position_kind. 선택(주로 그래플링)
  striking_style striking_style,          -- 타격만(PRD §4.1). 비타격 기술은 null.
  belt belt,                              -- "벨트 적합도"(주짓수만, 주관 가이드, PRD §4.3)
  belt_stripes int check (belt_stripes between 0 and 4),
  description_md text,                    -- 마크다운 설명
  details_md text,                        -- 주의점/디테일 (PRD F6 — UI 강조박스)
  visibility visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 글로벌 검색 fuzzy (PRD F8) — 냉장고 ingredient_master_name_trgm 패턴
create index techniques_name_trgm on techniques using gin (name gin_trgm_ops);
create index techniques_desc_trgm on techniques using gin (description_md gin_trgm_ops);
create index techniques_user_disc_idx on techniques(user_id, discipline, category);

alter table techniques enable row level security;
create policy "techniques_owns_rows" on techniques
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger techniques_set_updated_at before update on techniques
  for each row execute function set_updated_at();
-- 시작 시드(사용자 결정): 프리셋 기술은 가입 시 **본인 소유 복사본**으로 삽입(0015) →
-- techniques는 순수 user-owned 유지(RLS 단순·자유 편집/삭제). 전역 공유 테이블 불필요.
```

#### sessions + session_disciplines (PRD F2/F3)
```sql
-- 0006_sessions.sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trained_on date not null,               -- 캘린더 기본 단위 (KST 기준 날짜, 클라이언트가 보정 입력)
  gym text,                               -- 체육관/장소
  class_type class_type,
  duration_min int check (duration_min >= 0),
  intensity int check (intensity between 1 and 5),
  rounds int check (rounds >= 0),
  partners text,                          -- 자유 텍스트
  memo_md text,                           -- 요약 메모 (PRD F6)
  rating int check (rating between 1 and 5),
  visibility visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 캘린더 월간 그리드/하루상세 조회 인덱스 (PRD R2 성능)
create index sessions_user_date_idx on sessions(user_id, trained_on);
create index sessions_memo_trgm on sessions using gin (memo_md gin_trgm_ops);
create index sessions_gym_trgm  on sessions using gin (gym gin_trgm_ops);

alter table sessions enable row level security;
create policy "sessions_owns_rows" on sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger sessions_set_updated_at before update on sessions
  for each row execute function set_updated_at();

-- 세션 ↔ 종목 N:M (한 훈련에 복수 종목, PRD §4.1)
create table session_disciplines (
  session_id uuid not null references sessions(id) on delete cascade,
  discipline discipline not null,
  primary key (session_id, discipline)
);
-- 별도 RLS 불필요(부모 sessions FK cascade로 격리). 단, 접근은 항상 sessions JOIN을 통해.
-- 직접 노출 방지 위해 RLS enable + select 시 부모 소유 확인 정책을 둔다:
alter table session_disciplines enable row level security;
create policy "session_disciplines_via_parent" on session_disciplines
  for all
  using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));
```

#### session_techniques (세션↔기술 + 그날 메모 — PRD F3/F6)
```sql
-- 0007_session_techniques.sql
create table session_techniques (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  technique_id uuid not null references techniques(id) on delete cascade,
  day_memo_md text,                       -- "그날만의 메모" (PRD §4.6, F6/AC3)
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, technique_id)
);
create index session_techniques_technique_idx on session_techniques(technique_id); -- 역참조("이 기술을 다룬 세션들")

alter table session_techniques enable row level security;
create policy "session_techniques_via_parent" on session_techniques
  for all
  using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));
```

#### media_assets (하이브리드 — PRD F5)
```sql
-- 0008_media_assets.sql
create table media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind media_kind not null,               -- upload | youtube | external
  -- kind='upload': Storage 객체
  storage_path text,                      -- 'training-media/<user_id>/<uuid>.mp4' (user_id prefix 필수)
  duration_sec int,                       -- 업로드 길이 한도 검증/표시
  size_bytes bigint,                      -- 용량 한도 검증
  thumbnail_path text,                    -- 업로드 썸네일(Storage) — §5
  -- kind='youtube'
  youtube_video_id text,                  -- 'dQw4w9WgXcQ' (URL 아님, ID만)
  -- kind='external'
  external_url text,
  -- 공통
  title text,
  visibility visibility not null default 'private',
  created_at timestamptz not null default now(),
  -- 무결성: kind별 필수 컬럼 보장
  constraint media_kind_shape check (
    (kind = 'upload'   and storage_path is not null) or
    (kind = 'youtube'  and youtube_video_id is not null) or
    (kind = 'external' and external_url is not null)
  )
);
create index media_assets_user_idx on media_assets(user_id, created_at desc);

alter table media_assets enable row level security;
create policy "media_assets_owns_rows" on media_assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 듀얼 FK 연결(사용자 결정): 한 미디어가 세션 또는 기술에 연결. 대상이 2종(세션/기술)뿐이라
-- 폴리모픽 대신 실제 FK 2개 + XOR 체크 → DB 무결성·자동 cascade.
create table media_links (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references media_assets(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  technique_id uuid references techniques(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(session_id, technique_id) = 1)        -- 정확히 하나의 부모
);
-- 부모별 중복 연결 방지(부분 유니크) + 조회 인덱스
create unique index media_links_uq_session   on media_links(media_id, session_id)   where session_id is not null;
create unique index media_links_uq_technique on media_links(media_id, technique_id) where technique_id is not null;
create index media_links_session_idx   on media_links(session_id)   where session_id is not null;
create index media_links_technique_idx on media_links(technique_id) where technique_id is not null;

alter table media_links enable row level security;
-- 미디어 + 부모 모두 본인 소유여야(교차 연결 차단)
create policy "media_links_owns" on media_links
  for all
  using (
    exists (select 1 from media_assets m where m.id = media_id and m.user_id = auth.uid())
    and (session_id   is null or exists (select 1 from sessions   s where s.id = session_id   and s.user_id = auth.uid()))
    and (technique_id is null or exists (select 1 from techniques t where t.id = technique_id and t.user_id = auth.uid()))
  )
  with check (
    exists (select 1 from media_assets m where m.id = media_id and m.user_id = auth.uid())
    and (session_id   is null or exists (select 1 from sessions   s where s.id = session_id   and s.user_id = auth.uid()))
    and (technique_id is null or exists (select 1 from techniques t where t.id = technique_id and t.user_id = auth.uid()))
  );
```

#### tags + taggables (듀얼 FK N:M — PRD F7)
```sql
-- 0009_tags_taggables.sql
create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,                             -- P1 태그 색 (PRD F7/AC4)
  created_at timestamptz not null default now(),
  unique (user_id, name)                  -- 사용자별 태그 이름 유일
);
create index tags_name_trgm on tags using gin (name gin_trgm_ops);  -- 자동완성/검색

alter table tags enable row level security;
create policy "tags_owns_rows" on tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 듀얼 FK(사용자 결정): 태그가 세션 또는 기술에. 폴리모픽 대신 실제 FK 2개 + XOR.
create table taggables (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references tags(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  technique_id uuid references techniques(id) on delete cascade,
  check (num_nonnulls(session_id, technique_id) = 1)
);
create unique index taggables_uq_session   on taggables(tag_id, session_id)   where session_id is not null;
create unique index taggables_uq_technique on taggables(tag_id, technique_id) where technique_id is not null;
create index taggables_session_idx   on taggables(session_id)   where session_id is not null;
create index taggables_technique_idx on taggables(technique_id) where technique_id is not null;

alter table taggables enable row level security;
-- 태그 + 부모 모두 본인 소유여야
create policy "taggables_owns" on taggables
  for all
  using (
    exists (select 1 from tags t where t.id = tag_id and t.user_id = auth.uid())
    and (session_id   is null or exists (select 1 from sessions   s  where s.id  = session_id   and s.user_id  = auth.uid()))
    and (technique_id is null or exists (select 1 from techniques tc where tc.id = technique_id and tc.user_id = auth.uid()))
  )
  with check (
    exists (select 1 from tags t where t.id = tag_id and t.user_id = auth.uid())
    and (session_id   is null or exists (select 1 from sessions   s  where s.id  = session_id   and s.user_id  = auth.uid()))
    and (technique_id is null or exists (select 1 from techniques tc where tc.id = technique_id and tc.user_id = auth.uid()))
  );
```

### 4.5 뷰 (캘린더 성능 — PRD F2/R2)
```sql
-- 0010_views.sql
-- 캘린더 월간 그리드용 하루 요약: 날짜별 세션 수 + 그날 종목 집합 (점/칩 렌더)
-- security_invoker=true 필수: 미지정 시 뷰는 '소유자 권한'으로 실행되어 RLS를 우회한다.
create view calendar_day_summary with (security_invoker = true) as
  select
    s.user_id,
    s.trained_on,
    count(distinct s.id)                                   as session_count,
    array_agg(distinct sd.discipline)
      filter (where sd.discipline is not null)             as disciplines,
    bool_or(exists (
      select 1 from media_links ml
      where ml.session_id = s.id
    ))                                                     as has_media
  from sessions s
  left join session_disciplines sd on sd.session_id = s.id
  group by s.user_id, s.trained_on;
-- 위 security_invoker=true 로 인해 기반 테이블 RLS가 호출자(auth user) 기준으로 적용 → 본인 데이터만.
```

### 4.6 RPC

#### search_all(...) — 글로벌 검색 (PRD F8, 냉장고 search_ingredient_masters 패턴)
```sql
-- 0012_search_all.sql
-- techniques(name/description) + sessions(memo/gym) + tags(name) 통합 fuzzy.
-- ILIKE prefix(1.0) > substring(0.7) > similarity(trigram) hybrid rank (냉장고 패턴 동일).
create or replace function public.search_all(
  p_query text,
  p_limit int default 30
)
returns table (
  result_type text,        -- 'technique' | 'session' | 'tag'
  result_id uuid,
  title text,
  subtitle text,           -- 종목/날짜/카운트 등 부가표시
  rank real
)
language sql stable security invoker
set search_path = public, pg_temp
as $$
  with q as (select trim(p_query) as q)
  -- 기술
  select 'technique'::text, t.id, t.name,
         t.discipline::text as subtitle,
         case
           when t.name ilike (select qq.q || '%' from q qq) then 1.0::real
           when t.name ilike (select '%' || qq.q || '%' from q qq) then 0.7::real
           else greatest(similarity(t.name, (select qq.q from q qq)),
                         similarity(coalesce(t.description_md,''), (select qq.q from q qq)))
         end as rank
  from techniques t
  where t.user_id = auth.uid()
    and ( t.name ilike (select '%' || qq.q || '%' from q qq)
       or t.description_md ilike (select '%' || qq.q || '%' from q qq)
       or similarity(t.name, (select qq.q from q qq)) > 0.2 )
  union all
  -- 세션 (메모/체육관)
  select 'session'::text, s.id,
         coalesce(nullif(s.gym,''), to_char(s.trained_on,'YYYY-MM-DD')) as title,
         to_char(s.trained_on,'YYYY-MM-DD') as subtitle,
         case
           when s.gym ilike (select qq.q || '%' from q qq) then 0.9::real
           else greatest(similarity(coalesce(s.memo_md,''), (select qq.q from q qq)),
                         similarity(coalesce(s.gym,''),     (select qq.q from q qq)))
         end as rank
  from sessions s
  where s.user_id = auth.uid()
    and ( s.memo_md ilike (select '%' || qq.q || '%' from q qq)
       or s.gym     ilike (select '%' || qq.q || '%' from q qq) )
  union all
  -- 태그
  select 'tag'::text, tg.id, tg.name, null::text,
         case when tg.name ilike (select qq.q || '%' from q qq) then 1.0::real
              else similarity(tg.name, (select qq.q from q qq)) end as rank
  from tags tg
  where tg.user_id = auth.uid()
    and ( tg.name ilike (select '%' || qq.q || '%' from q qq)
       or similarity(tg.name, (select qq.q from q qq)) > 0.2 )
  order by rank desc
  limit p_limit;
$$;

grant execute on function public.search_all(text, int) to authenticated;
```

#### log_session(...) — 세션 원자 삽입 (PRD F3, 냉장고 log_cooking_session 패턴)
세션 1건 + 종목 N + 기술링크 N(그날 메모 포함) + 태그 N + 미디어링크 N을 **단일 트랜잭션**으로. `security invoker` + 본문 `auth.uid()` 검증 + 실패 시 rollback(서버 액션에서 한국어 변환).
```sql
-- 0013_log_session.sql
-- p_disciplines: jsonb 배열 of discipline 문자열  e.g. ["bjj_nogi","mma"]
-- p_techniques:  [{ "technique_id": "<uuid>", "day_memo_md": "<text|null>" }]
-- p_tag_ids:     ["<uuid>", ...]                     (이미 존재하는 태그 id)
-- p_media:       [{ "media_id": "<uuid>" }]           (이미 생성된 media_assets 연결)
create or replace function public.log_session(
  p_user uuid,
  p_trained_on date,
  p_gym text default null,
  p_class_type class_type default null,
  p_duration_min int default null,
  p_intensity int default null,
  p_rounds int default null,
  p_partners text default null,
  p_memo_md text default null,
  p_rating int default null,
  p_disciplines jsonb default '[]'::jsonb,
  p_techniques jsonb default '[]'::jsonb,
  p_tag_ids jsonb default '[]'::jsonb,
  p_media jsonb default '[]'::jsonb
)
returns uuid                              -- sessions.id
language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare
  v_session_id uuid;
  v_disc text;
  v_tech jsonb;
  v_tag uuid;
  v_media jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user then
    raise exception 'unauthorized: auth.uid() mismatch';
  end if;
  if jsonb_array_length(p_disciplines) = 0 then
    raise exception 'discipline_required';  -- PRD F3/AC1: 종목 1개 이상 필수
  end if;

  insert into sessions (user_id, trained_on, gym, class_type, duration_min,
                        intensity, rounds, partners, memo_md, rating)
  values (p_user, p_trained_on, p_gym, p_class_type, p_duration_min,
          p_intensity, p_rounds, p_partners, p_memo_md, p_rating)
  returning id into v_session_id;

  for v_disc in select jsonb_array_elements_text(p_disciplines) loop
    insert into session_disciplines (session_id, discipline)
    values (v_session_id, v_disc::discipline) on conflict do nothing;
  end loop;

  for v_tech in select * from jsonb_array_elements(p_techniques) loop
    insert into session_techniques (session_id, technique_id, day_memo_md)
    values (v_session_id, (v_tech->>'technique_id')::uuid, v_tech->>'day_memo_md')
    on conflict (session_id, technique_id) do update set day_memo_md = excluded.day_memo_md;
  end loop;

  for v_tag in select (jsonb_array_elements_text(p_tag_ids))::uuid loop
    insert into taggables (tag_id, session_id)
    values (v_tag, v_session_id) on conflict do nothing;
  end loop;

  for v_media in select * from jsonb_array_elements(p_media) loop
    insert into media_links (media_id, session_id)
    values ((v_media->>'media_id')::uuid, v_session_id) on conflict do nothing;
  end loop;

  return v_session_id;
end;
$$;

grant execute on function public.log_session(uuid, date, text, class_type, int, int, int, text, text, int, jsonb, jsonb, jsonb, jsonb)
  to authenticated;
```
> 주의: RPC 본문은 RLS를 우회하지 않음(`security invoker`). 자식 INSERT는 위 RLS(`*_via_parent`/`*_owns`) 정책을 통과해야 하므로 세션/태그/미디어가 모두 `p_user` 소유여야 성공. (타인 소유 tag_id/media_id를 넘기면 듀얼FK RLS가 차단.)

### 4.6b 0015 — 시작 기술 프리셋 시드 (사용자 결정: 프리셋 시드)
프리셋 기술을 **신규 가입자의 본인 소유 복사본**으로 삽입(전역 공유 테이블 대신 → techniques는 순수 user-owned 유지, 사용자가 자유롭게 편집/삭제). techniques(0005) 이후이므로 `handle_new_user`를 재정의해 시드 호출.
```sql
-- 0015_starter_techniques.sql
create or replace function public.seed_starter_techniques(p_user uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if exists (select 1 from techniques where user_id = p_user) then
    return;                                  -- 이미 보유 시 skip(재호출 안전)
  end if;
  insert into techniques (user_id, name, discipline, category, position, belt, striking_style, description_md, details_md)
  values
    (p_user, '마운트 이스케이프 (엘보-니)',  'bjj_gi',    'escape',      'mount',        'white', null,        '...', '...'),
    (p_user, '트라이앵글 초크',              'bjj_nogi',  'submission',  'closed_guard', 'blue',  null,        '...', '...'),
    (p_user, '더블 레그 테이크다운',         'wrestling', 'takedown',    'standing',     null,    null,        '...', '...'),
    (p_user, '잽-크로스-로우킥',            'striking',  'combination', 'standing',     null,    'muay_thai', '...', '...')
    -- … 종목별 8~12개(흰/파랑 위주) — 프리셋 전체 목록은 콘텐츠로 확정(§14 TODO).
  ;
end;
$$;

-- handle_new_user 재정의: 가입 시 프로필 + 프리셋 시드 (0003 함수 대체)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  insert into public.profiles (user_id, display_name, timezone)
  values (new.id, '', 'Asia/Seoul') on conflict (user_id) do nothing;
  perform public.seed_starter_techniques(new.id);
  return new;
end;
$$;
```

### 4.7 `db:types` 생성 스크립트
냉장고 앱엔 없었던 타입 생성 스크립트를 **본 프로젝트에 추가**(`apps/web/package.json` scripts — 냉장고 후속 브랜치 패턴과 동일):
```jsonc
{
  "scripts": {
    "db:start":  "supabase start",
    "db:push":   "supabase db push --linked",
    "db:types":  "supabase gen types typescript --linked > src/shared/api/supabase/types.ts",
    "db:reset":  "supabase db reset",
    "db:diff":   "supabase db diff -f",
    "db:check-drift": "node scripts/check-migration-drift.mjs"
  }
}
```
생성물 `src/shared/api/supabase/types.ts`의 `Database` 타입을 server/client/admin 클라이언트가 제네릭으로 사용(`createServerClient<Database>(...)`). 스키마 변경 시 `pnpm web db:push` → `pnpm web db:types` → 커밋(드리프트 체크 `db:check-drift`로 보장).

---

## 5. 스토리지 전략 (하이브리드)

PRD F5: 짧은 클립 = Supabase Storage 직접 업로드(비공개), 긴 영상 = YouTube(미등록)/외부 링크.

### 5.1 버킷 설계
- **단일 비공개 버킷 `training-media`** (`public=false`). 객체 경로 규약:
  ```
  training-media/<user_id>/videos/<uuid>.<ext>      # 원본 클립
  training-media/<user_id>/thumbs/<uuid>.jpg        # 썸네일
  ```
  - **user_id를 경로 첫 세그먼트로 강제** → storage RLS가 `(storage.foldername(name))[1] = auth.uid()::text`로 격리(냉장고엔 Storage가 없었으나 동일 RLS 철학 적용).
- MIME 화이트리스트: `video/mp4`, `video/quicktime`, `image/jpeg`, `image/png`, `image/webp`.

### 5.2 Storage RLS / 정책
```sql
-- 0014_storage_policies.sql  (storage.objects 대상)
-- 본인 폴더만 read/insert/update/delete. service_role(admin client)은 RLS bypass.
create policy "training_media_read_own" on storage.objects
  for select to authenticated
  using ( bucket_id = 'training-media'
          and (storage.foldername(name))[1] = auth.uid()::text );

create policy "training_media_insert_own" on storage.objects
  for insert to authenticated
  with check ( bucket_id = 'training-media'
               and (storage.foldername(name))[1] = auth.uid()::text );

create policy "training_media_update_own" on storage.objects
  for update to authenticated
  using ( bucket_id = 'training-media'
          and (storage.foldername(name))[1] = auth.uid()::text );

create policy "training_media_delete_own" on storage.objects
  for delete to authenticated
  using ( bucket_id = 'training-media'
          and (storage.foldername(name))[1] = auth.uid()::text );
```
(버킷 생성 자체는 마이그레이션의 `insert into storage.buckets (...)` 또는 `config.toml` 로컬 선언 + 대시보드/`supabase storage` CLI로 원격 생성.)

### 5.3 업로드 한도 + 검증 (이중 방어)
- **한도(기본값, 확정 필요)**: **≤ 60초 / ≤ 100MB / mp4·mov**. 환경변수 `NEXT_PUBLIC_UPLOAD_MAX_*`로 노출(클라이언트 사전 검증), 서버/버킷 `file_size_limit`로 강제.
- **클라이언트(브라우저)**: 파일 선택 시 `file.size`·`<video>.duration`(메타데이터 로드)·MIME 검사 → 초과 시 "유튜브로 올려주세요" 안내(PRD F5/AC1).
- **서버(`/api/media/sign-upload`)**: 요청 바디(filename/size/mime/duration)를 Zod 검증 + 한도 재확인 후에만 서명 URL 발급. 한도 초과/허용 외 MIME면 4xx.
- **모바일(네이티브)**: expo-image-picker `videoMaxDuration`/선택 후 `expo-video` 메타로 길이·용량 확인 → 초과 시 네이티브 Alert.

### 5.4 서명 URL 서빙
- **업로드**: `/api/media/sign-upload`(Route Handler, admin client) → `storage.from('training-media').createSignedUploadUrl(path)` → 브라우저/네이티브가 그 URL로 직접 PUT. (서버를 경유하지 않아 Vercel 함수 대역폭 절약.)
- **재생**: 조회 시 `createSignedUrl(path, 600)`(10분 만료, **확정 필요**)을 RSC/Route Handler에서 발급. anon 클라이언트가 본인 객체에 대해 직접 `createSignedUrl` 호출도 가능(RLS read 정책 통과). 공개 URL은 절대 사용 안 함(PRD F5/AC4).

### 5.5 썸네일 전략
- **유튜브**: `https://i.ytimg.com/vi/<videoId>/hqdefault.jpg` (별도 저장 불필요).
- **외부 링크**: 대표 이미지 없음 → 종목/링크 아이콘 플레이스홀더.
- **업로드 영상(확정 필요)**:
  - MVP 기본: 클라이언트에서 첫 프레임 캡처(`<video>`+`<canvas>` 또는 모바일 `expo-video` 썸네일)를 `thumbs/<uuid>.jpg`로 업로드.
  - 대안(P1): Supabase **Storage image transformation**(Pro 플랜) 또는 Edge Function(ffmpeg)로 서버 생성. → §14 TODO.

### 5.6 YouTube / 외부 경로
- 긴 영상은 사용자가 유튜브(미등록) 업로드 후 링크 붙여넣기, 또는 앱 내 검색(§7)으로 추가 → `media_assets(kind='youtube', youtube_video_id=...)`.
- 임의 외부 URL은 `kind='external', external_url=...`. 렌더는 링크/임베드(허용 도메인 화이트리스트, sanitize).

---

## 6. 웹 (Next.js FSD) 레이어 설계

FSD 레이어: `app → widgets → features → entities → shared` (상위가 하위만 import, 역방향 금지). 냉장고 앱 슬라이스 구조를 MMA 도메인으로 치환.

### 6.1 `entities/` (도메인 모델 + supabase 쿼리 + 포맷/스코어 lib)
각 슬라이스 = `model/`(타입·zod 스키마), `api/`(supabase 쿼리 함수), `lib/`(포맷·매핑·라벨), `ui/`(원자적 표시 컴포넌트), `index.ts`(public API).

| 슬라이스 | 핵심 내용 |
|---|---|
| `entities/discipline/` | `lib/discipline-meta.ts`(코드→한글 라벨·색·아이콘 + **discipline→rank_track 매핑** + `striking_style` 라벨, PRD §4.1/F9), `ui/DisciplineBadge`. enum 상수 단일 출처(TS↔SQL 동치). |
| `entities/rank/` | `model`(UserRank: **rank_track 기반**, bjj=gi·nogi 공유), `ui/BeltBadge`(벨트색+스트라이프, PRD F9/AC1), `api/getUserRanks`,`upsertRank`. |
| `entities/technique/` | `model`(Technique + zod), `api/{listTechniques,getTechnique,createTechnique,updateTechnique,getSessionsForTechnique}`, `lib/category-meta.ts`(종목별 노출 분류 필터, PRD §4.2), `ui/{TechniqueCard,CategoryChip,PositionChip}`. |
| `entities/session/` | `model`(Session + zod), `api/{getDaySessions,getMonthSummary,createSession,updateSession,deleteSession,logSession(rpc)}`, `lib/format-session.ts`(시간/강도/평점 포맷), `ui/SessionHeader`. |
| `entities/media/` | `model`(MediaAsset), `api/{linkMedia,unlinkMedia,getSignedUrl,createMediaRow}`, `lib/youtube.ts`(URL→videoId 파싱), `ui/{MediaThumb,VideoPlayer,YoutubeEmbed-wrapper}`. |
| `entities/tag/` | `model`(Tag), `api/{searchTags,createTag,getTaggedItems}`, `ui/TagPill`. |

> 스코어/상수 패턴(냉장고 `scoring-constants.ts`↔SQL inline 동치)을 본 앱에선 **enum 라벨/색 상수**에 적용: `entities/discipline/lib/discipline-meta.ts`·`belt` 값은 SQL enum과 1:1. 변경 시 마이그레이션+TS 동시 수정(PR 룰).

### 6.2 `features/` (사용자 인터랙션 단위)
| 슬라이스 | 매핑 PRD | 비고 |
|---|---|---|
| `features/auth/` | F1 | 로그인/회원가입 폼 + Server Action 연동(기존 `(auth)/actions.ts` 재사용) |
| `features/log-session/` | F3 | 세션 추가/수정 폼 → `logSession` RPC. 종목 멀티선택, 기술 연결, 태그, 미디어 첨부 통합. |
| `features/calendar-view/` | F2 | react-calendar 커스텀 + 월간 요약(점/칩) 페치, 월 이동/오늘 점프 |
| `features/technique-catalog/` | F4 | 기술 목록 카드 그리드 + 생성/수정 |
| `features/media-upload/` | F5 | 서명 업로드 플로우(웹) + WebView 브릿지 호출(모바일) + 진행률/취소/재시도 |
| `features/youtube-embed/` | F5/F7 | **기존 슬라이스 재사용**(api/route-handler + 임베드 UI) |
| `features/global-search/` | F8 | 상단 검색바 → `search_all` RPC → 타입별 그룹 결과 |
| `features/tag-filter/` | F7 | 태그 자동완성·다중 AND 필터 |

### 6.3 `widgets/` (페이지 조립 블록)
| 슬라이스 | 내용 |
|---|---|
| `widgets/app-shell/` | 상단 고정 검색바 + 내비(웹: 사이드/상단 탭, PRD §7) + 빠른추가 FAB. **냉장고 app-shell 자리 재작성.** |
| `widgets/calendar/` | 월간 그리드 위젯(calendar-view feature + day cell 렌더) |
| `widgets/day-detail/` | 하루 상세(세션 목록 → 기술/미디어/메모) |
| `widgets/session-editor/` | 세션 생성/편집 패널(log-session + media-upload + tag-filter 조합) |
| `widgets/technique-detail/` | 기술 상세(설명/디테일 강조박스/내영상+유튜브 나란히/역참조 세션) |
| `widgets/search-results/` | 검색 결과(기술/세션/태그 그룹핑) |

### 6.4 `app/` 라우트 (App Router + route groups)
```
src/app/
├── layout.tsx                      # 루트(Providers: QueryClient, theme)
├── globals.css
├── (auth)/
│   ├── actions.ts                  # signup/login/logout Server Action (기존 재사용)
│   ├── login/{page.tsx,login-form.tsx}
│   └── signup/{page.tsx,signup-form.tsx}
├── (app)/
│   ├── layout.tsx                  # app-shell(검색바+내비+FAB), 인증 가드
│   ├── calendar/{page.tsx,loading.tsx}       # 홈(F2)
│   ├── techniques/
│   │   ├── {page.tsx,loading.tsx}            # 기술 목록(F4)
│   │   └── [techniqueId]/{page.tsx,loading.tsx}  # 기술 상세
│   ├── search/page.tsx              # 검색 결과(F8)
│   └── profile/page.tsx             # 프로필 + 종목별 랭크(F1)
└── api/
    ├── youtube/search/route.ts      # 기존 재사용(24h cache)
    ├── media/sign-upload/route.ts   # 신규: 서명 업로드 URL 발급(admin client)
    └── health/route.ts              # 기존 재사용
```
> 캘린더는 PRD §7대로 홈(`(app)` 진입 기본). 하루상세/세션편집은 라우트 분리 대신 캘린더 위에 패널/모달(react dialog)로 띄워 마찰 최소화(J1 ~90초 목표) — 딥링크가 필요하면 `calendar?date=YYYY-MM-DD&session=<id>` 쿼리로.

### 6.5 `shared/`
- `shared/api/supabase/{server,client,admin,index,types}.ts` — **기존 그대로**(server-only server/admin, browser client, `Database` 타입). `index.ts` export 4종 유지.
- `shared/ui/` — 디자인시스템 원자(Button/Badge/Dialog 래퍼/Toaster[sonner]). (상세 Design.md)
- `shared/lib/` — dayjs KST 헬퍼, markdown sanitize(dompurify), zod 공통.
- `shared/config/` — enum 라벨/색 등 (또는 entities로 분산), 업로드 한도 상수 reader.
- `shared/styles/` — Tailwind v4 테마(흰/검/빨, Pretendard) — 기존 파일 재사용.

---

## 6b. 데이터 패칭 & 상태

- **RSC(서버 컴포넌트)**: 페이지 1차 데이터(`calendar`, `techniques`, `technique/[id]`, `profile`)는 `createSupabaseServerClient()`(쿠키→anon, RLS 적용)로 서버에서 페치 후 스트리밍. `loading.tsx`로 서스펜스 폴백.
- **TanStack Query(클라이언트)**: 캘린더 월 이동·검색·필터처럼 상호작용으로 바뀌는 데이터는 Query로 캐시/리페치. 초기값은 RSC가 내려준 데이터로 hydrate. Query key 컨벤션 예: `['sessions','month', userId, 'YYYY-MM']`, `['technique', id]`, `['search', q]`.
- **뮤테이션**: 세션/기술 CUD는 Server Action(폼) 또는 Query `useMutation`+브라우저 클라이언트. 성공 시 `invalidateQueries`(`sessions`, `calendar_day_summary` 파생) + sonner toast.
- **Zustand**: 서버 상태가 아닌 **UI 상태만**(검색바 열림, 세션 에디터 드래프트, 선택된 날짜, 필터 칩 선택). 서버 데이터는 Query가 단일 출처.
- **Axios**: `/api/youtube/search` 등 자체 Route Handler 호출용(기존 패턴). Supabase는 SDK 직접 사용.
- **미들웨어**: `src/proxy.ts`가 매 요청 `supabase.auth.getUser()`로 세션 갱신(기존 그대로). 보호 라우트(`(app)/*`) 미인증 → `/login` 리다이렉트(레이아웃 가드).

### 서명 업로드 플로우 (end-to-end)
```
[웹]  파일선택 → 클라 검증(size/duration/mime)
      → POST /api/media/sign-upload {filename,size,mime,durationSec}
      → (서버 admin) Zod+한도 검증 → createSignedUploadUrl('training-media/<uid>/videos/<uuid>.mp4')
      → 브라우저가 signed URL로 PUT(진행률 XHR/fetch) → (옵션) 썸네일 PUT
      → POST 결과로 media_assets row 생성(kind='upload', storage_path,...) → session/technique에 media_links 연결
[모바일]  WebView가 MEDIA_PICK_REQUEST/MEDIA_CAPTURE_REQUEST 전송
      → 네이티브가 파일 확보 → /api/media/sign-upload(secure-store 토큰으로 인증) → 직접 PUT
      → MEDIA_UPLOAD_PROGRESS 다회 → MEDIA_UPLOAD_RESULT{ assetRef|storagePath } 를 WebView로
      → 웹이 media_assets row + media_links 처리(동일 코드 경로)
```

---

## 7. YouTube 통합

- **재사용**: `app/api/youtube/search/route.ts` + `features/youtube-embed/api/route-handler`(cache lookup/fetch/write) 그대로. `YOUTUBE_API_KEY`는 Route Handler 내부에서만(클라 노출 금지). quota 초과·키 부재 시 graceful 빈 배열(기존 동작).
- **`youtube_cache` 테이블**: 냉장고와 동일 구조(`query_key text pk`, `payload jsonb`, `fetched_at timestamptz`, 24h TTL, RLS `select using(true)` + write는 admin). `query_key` prefix만 MMA에 맞게: 예 `mma:<검색어>`(냉장고는 `recipe:`). payload shape(videoId/title/thumbnails/channelTitle/durationSeconds?)도 동일.
- **media_asset로 저장**: 검색 결과/URL 입력에서 `youtube_video_id`만 추출(`entities/media/lib/youtube.ts`로 다양한 URL 형태 파싱) → `media_assets(kind='youtube', youtube_video_id, title)` → 임베드 재생(`https://www.youtube.com/embed/<id>`). URL 원문 저장 안 함(ID 정규화).

---

## 8. 검색 & 태그 구현

### 8.1 글로벌 검색 (PRD F8)
- `pg_trgm`(0001) 기반 `search_all(p_query,p_limit)` RPC(§4.6, 내부에서 `auth.uid()` 사용). techniques(name+description), sessions(memo+gym), tags(name)을 union, ILIKE prefix>substring>similarity hybrid rank(냉장고 `search_ingredient_masters` 미러). 한글 부분일치 지원.
- 호출: 상단 검색바(`features/global-search`) → 디바운스 → 브라우저 클라이언트 `supabase.rpc('search_all', {...})` → 타입별 그룹핑(`widgets/search-results`) → 클릭 시 해당 상세(technique/[id], calendar?session=, tag 필터).
- 인덱스: `techniques_name_trgm`/`techniques_desc_trgm`/`sessions_memo_trgm`/`sessions_gym_trgm`/`tags_name_trgm`(gin_trgm_ops).

### 8.2 태그 (PRD F7)
- **부여**: `tags`(user별 unique name) + `taggables`(**듀얼 FK** `session_id`/`technique_id`, XOR). 입력 시 자동완성(`searchTags` = tags name_trgm) + 미존재 시 신규 생성.
- **태그별 보기**: 태그 선택 → `taggables`에서 `tag_id` JOIN으로 세션·기술 모아보기.
- **다중 AND 필터**(F7/AC3): N개 태그 모두 가진 항목 = `group by parent + having count(distinct tag_id) = N`:
  ```sql
  -- 예: 세션 중 선택 태그 전부를 가진 것
  select s.*
  from sessions s
  join taggables tg on tg.session_id = s.id
  where s.user_id = auth.uid() and tg.tag_id = any($1::uuid[])
  group by s.id
  having count(distinct tg.tag_id) = array_length($1, 1);
  ```
  기술도 동형(`tg.technique_id = t.id` JOIN). entities/tag api에 `getTaggedItems(tagIds, parent)`로 캡슐화.

---

## 9. 모바일 (Expo) 계획

### 9.1 셸 재사용 + 네이티브 추가
- **WebView 셸**: `components/screens/webview-screen.tsx`·`hooks/webview/*`·`config/env.ts`(`CLIENT_URL`)·`app/(tabs)/web.tsx`·`app/_layout.tsx`(security gate, version check) **그대로**. 데모 탭(`index`/`explore`)은 제거하고 web 탭 중심으로(또는 캘린더/기술/검색을 모두 WebView로, 촬영만 네이티브).
- **신규 의존성**(SDK 54 호환): `expo-camera`, `expo-image-picker`, `expo-video`, `expo-secure-store`. (app.json plugins + 권한 문자열: 카메라/사진/마이크 사용 설명.)

### 9.2 webview-protocol 확장 (단일 출처)
`packages/webview-protocol/src/index.ts`에 미디어 도메인 메시지 추가(기존 envelope·AuthMessage 유지):
```ts
// 추가 — Media 도메인 (WebView → Native 요청, Native → WebView 결과)
export type MediaPickOptions = {
  source: 'gallery' | 'camera';
  maxDurationSec?: number;     // 클립 길이 한도(§5)
  maxBytes?: number;           // 용량 한도(§5)
};

export type MediaAssetRef = {
  storagePath: string;         // 'training-media/<uid>/videos/<uuid>.mp4'
  kind: 'upload';
  durationSec?: number;
  sizeBytes?: number;
  thumbnailPath?: string;
  mime: string;
};

export type MediaMessage =
  // WebView → Native
  | { mode: 'MEDIA_PICK_REQUEST';    data: MediaPickOptions }   // 갤러리에서 선택
  | { mode: 'MEDIA_CAPTURE_REQUEST'; data: MediaPickOptions }   // 카메라로 즉석 촬영
  | { mode: 'MEDIA_UPLOAD_CANCEL';   data: { uploadId: string } }
  // Native → WebView
  | { mode: 'MEDIA_UPLOAD_PROGRESS'; data: { uploadId: string; progress: number } } // 0..1
  | { mode: 'MEDIA_UPLOAD_RESULT';   data: { uploadId: string; ok: true; asset: MediaAssetRef } }
  | { mode: 'MEDIA_UPLOAD_RESULT';   data: { uploadId: string; ok: false; error: string } };

// 전체 합집합(브릿지 dispatch 타입)
export type WebviewBridgeMessage = AuthMessage | MediaMessage;
```

### 9.3 네이티브 핸들러
`apps/mobile/hooks/webview/handlers/media-handlers.ts` 신설(`createMediaHandlers(ctx)`), `use-webview-message.ts`의 dispatch에 합성(common → auth → **media** → system). `HandlerContext`에 `media?` 슬롯 추가(auth 슬롯과 동형):
- `MEDIA_PICK_REQUEST` → `expo-image-picker.launchImageLibraryAsync({ mediaTypes:'videos', videoMaxDuration })`.
- `MEDIA_CAPTURE_REQUEST` → `expo-camera`/`launchCameraAsync` 촬영.
- 확보 후: `expo-video`로 길이·용량 메타 확인 → 한도 검증 → `/api/media/sign-upload`(secure-store 토큰 Authorization) → signed URL로 직접 PUT(진행률 → `MEDIA_UPLOAD_PROGRESS`) → 완료 시 `MEDIA_UPLOAD_RESULT{asset}`를 `ctx.sendToWebview`로.
- 취소: `MEDIA_UPLOAD_CANCEL` → 진행 중 업로드 abort.

### 9.4 네이티브 vs WebView 경계
| 기능 | 위치 |
|---|---|
| 캘린더/기술/세션 CRUD/검색/태그/유튜브 임베드 | **WebView(웹앱)** |
| 카메라 촬영, 갤러리 선택, 파일 메타 검증, Storage 직접 업로드, 진행률 | **네이티브** |
| 세션/기술에 media 연결, media_assets row 생성 | **WebView(웹앱)** — 네이티브가 준 assetRef 사용 |
| 세션 토큰 보관 | **네이티브 expo-secure-store** |
| jailbreak/integrity, 버전체크, 오프라인 배너 | **네이티브(기존 모듈)** |

### 9.5 환경
`config/env.ts`의 `CLIENT_URL`을 새 Vercel 도메인(dev/beta/prod)으로. 네이티브 업로드에 필요한 `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만 추가(secret 키 금지 — 서명 URL은 웹 Route Handler가 발급).

---

## 10. 인증 플로우

- **웹**: Supabase Auth(이메일+비밀번호, 추후 소셜). `(auth)/actions.ts` Server Action(signup/login/logout) 재사용 — `signInWithPassword`/`signUp`/`signOut` + `revalidatePath` + redirect. `@supabase/ssr` 쿠키 세션, `proxy.ts` 미들웨어가 갱신. `(app)/*`는 RSC/레이아웃에서 `getUser()` 없으면 `/login`.
- **모바일**: WebView 안 웹앱이 1차 인증 주체. 네이티브 직접 업로드용 토큰이 필요하므로:
  - 웹 로그인 성공 시 웹이 `AUTH_LOGIN`(또는 토큰 핸드오프 메시지)로 access/refresh 토큰을 네이티브에 전달 → 네이티브가 **expo-secure-store**에 저장(`ctx.auth.onLogin`).
  - 네이티브가 `/api/media/sign-upload` 호출 시 secure-store access token을 Authorization 헤더로.
  - 만료 시 `AUTH_TOKEN_REFRESH`로 갱신(기존 메시지 타입 활용), 로그아웃 시 `AUTH_LOGOUT` → secure-store clear.
  - (대안) 네이티브가 anon 키 + 저장된 세션으로 supabase-js를 직접 들고 Storage 업로드 — 단 secret 키는 절대 미반입.
- **RLS**: 모든 접근은 `auth.uid()=user_id`로 차단(§4). RPC도 `security invoker` + 본문 검증. service_role(admin client)은 서버 한정(youtube_cache write, 서명 URL 발급, health).

---

## 11. 테스트 & CI

### 11.1 단위 (Vitest)
- `vitest.config.ts`(jsdom, `vitest.setup.ts`, `@`→src alias, e2e/.next 제외) 재사용.
- 대상: `entities/*/lib`(discipline/belt 라벨·색 매핑, youtube URL→id 파싱, session 포맷, category 종목필터), `entities/*/model`(zod 스키마), 검색/태그 쿼리 빌더 순수함수, 업로드 한도 검증기.
- 스크립트: `test`/`test:watch`/`test:ui`/`test:coverage`(냉장고와 동일).

### 11.2 e2e (Playwright)
- `playwright.config.ts` 재사용: `PORT=3100 pnpm dev`, `.env.test` 로드, `webServer.env`로 **로컬 supabase 강제**(`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, 키는 `E2E_*` env에서, **하드코딩 금지**). 냉장고 전용 commerce 토글 env는 제거.
- 사전: `pnpm web db:start`(로컬 supabase) + `supabase status` 키를 `.env.test`에 기입.
- 핵심 저니(PRD §5):
  - **J1**: 로그인 → 캘린더 오늘 `+` → 종목(노기)+체육관+수업유형 → 기술 연결 + 그날 메모 + 태그 → 저장 → 캘린더 점 반영.
  - **J2**: 과거 날짜 셀 클릭 → 하루상세 → 기술 카드 → 내영상+유튜브 표시.
  - **J3**: 검색바 "보우앤애로우" → 기술/세션/태그 그룹 결과 → 상세 이동. 태그 `#스윕` 필터.
  - **J4**: 기술 카드 종목 배지 + 벨트 배지 렌더 검증.
  - 미디어: 유튜브 검색 추가(업로드는 모킹/소형 픽스처) + 업로드 한도 초과 경고.

### 11.3 pre-commit (lefthook + gitleaks)
- `lefthook.yml` 재사용: `gitleaks protect --staged --no-banner` + `pnpm web typecheck`(glob `apps/web/src/**/*.{ts,tsx}`). `.gitleaks.toml` allowlist 유지. 모바일 typecheck도 추가 권장(`pnpm mobile typecheck`).

### 11.4 GitHub Actions (개요)
```yaml
# .github/workflows/ci.yml (개요)
on: [push, pull_request]
jobs:
  verify:
    steps:
      - checkout
      - pnpm/action-setup (10.33.0) + setup-node 20 (cache pnpm)
      - pnpm install --frozen-lockfile
      - pnpm typecheck            # turbo: web + mobile + webview-protocol
      - pnpm lint                 # turbo: next core-web-vitals + expo
      - pnpm web test             # vitest
      - gitleaks/gitleaks-action  # push-protection 보강
  e2e:
    services: # supabase CLI 로컬 (or supabase start in step)
      - run: pnpm dlx supabase start
      - pnpm web db:reset         # 마이그레이션 + seed
      - 키를 E2E_* secrets로 주입(.env.test 생성) — 절대 평문 커밋 금지
      - pnpm web test:e2e
```
- 시크릿은 GitHub Actions Secrets(`E2E_SUPABASE_*`, `YOUTUBE_API_KEY`)로만. push protection ON 유지.

---

## 12. 마일스톤 & 시퀀싱

의존성 기준 순서(날짜 무관). 각 Phase 끝에 typecheck+해당 e2e 통과를 게이트로.

- **Phase 0 — 부트스트랩 (선행 전부)**
  새 레포 생성(§3) → 냉장고 도메인 제거 → 새 Supabase/Vercel 링크 → 인증 골격((auth)+proxy.ts)+`/api/health` 동작 → `.env.example`/`.gitleaks`/lefthook 확인 → `db:types` 스크립트 추가.
  *Depends on:* 없음.

- **Phase 1 — 스키마 & 엔티티 (F1 데이터 기반)**
  마이그레이션 0001~0010 + RLS + `handle_new_user()` → `pnpm web db:push` → `db:types` 생성 → `entities/{discipline,rank,technique,session,media,tag}` model/api/lib 작성 → profiles/user_ranks CRUD(F1).
  *Depends on:* Phase 0.

- **Phase 2 — 캘린더 & 세션 (F2·F3·F6)**
  `calendar_day_summary` 뷰 + `log_session` RPC(0010·0013) → `features/calendar-view`·`features/log-session` → `widgets/{calendar,day-detail,session-editor}` → `(app)/calendar`. 세션 CRUD가 캘린더에 즉시 반영.
  *Depends on:* Phase 1.

- **Phase 3 — 기술 라이브러리 & 미디어 (F4·F5·F9)**
  `techniques` CRUD + `(app)/techniques[/id]` + `widgets/technique-detail`(역참조) → `entities/discipline`·`rank` 배지(F9) → 스토리지 버킷+정책(0014) + `/api/media/sign-upload` + `features/media-upload`(웹 서명 업로드) + 유튜브 첨부(§7).
  *Depends on:* Phase 1(미디어 테이블), Phase 2(세션 첨부 지점).

- **Phase 4 — 검색 & 태그 (F7·F8)**
  `search_all` RPC(0012) + `features/global-search` + `widgets/search-results` → `tags`/`taggables` + `features/tag-filter`(자동완성·AND 필터) → app-shell 상단 검색바 통합.
  *Depends on:* Phase 2·3(검색 대상 데이터).

- **Phase 5 — 모바일 캡처 브릿지 (F5 모바일)**
  webview-protocol `MEDIA_*` 확장(§9.2) → 모바일 deps(camera/image-picker/video/secure-store) → `media-handlers` + secure-store 토큰 + 네이티브→Storage 직접 업로드 → 토큰 핸드오프 인증(§10) → `CLIENT_URL` 새 도메인.
  *Depends on:* Phase 3(`/api/media/sign-upload`·media_assets), Phase 0(셸).

- **P1** (MVP 직후): 주간/아젠다 뷰(F2) · 통계 대시보드(F10) · 검색 패싯 필터(F8) · 태그 관리·색(F7) · 비그래플링 `level`(user_ranks.level) · 썸네일 편집/서버 생성(§5.5) · 정렬/즐겨찾기.
- **P2** (향후): 공유/코멘트(F11 — `shares` 테이블 도입 + visibility 활용 RLS 확장) · 푸시 리마인더 · 오프라인 · 대회 트래킹 · AI 영상 태깅.

> 공유 시드(PRD §12): 모든 사용자 테이블에 `visibility` 이미 존재(§4). P2에서 `shares(resource_type,resource_id,grantee_user_id,permission)` 추가 + RLS를 `auth.uid()=user_id OR exists(share...)`로 확장. MVP는 손대지 않음.

---

## 13. 배포

- **웹(Vercel)**: 새 프로젝트 연결(root = monorepo, build = `apps/web` Next 16). 환경변수(Vercel → Settings → Environment Variables, **평문 커밋 금지**): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `YOUTUBE_API_KEY`, `NEXT_PUBLIC_UPLOAD_MAX_*`, `NEXT_PUBLIC_MEDIA_BUCKET`. Preview/Prod 분리. `/api/health`로 배포 후 헬스 체크.
- **Supabase 마이그레이션 배포**: `supabase link --project-ref <prod>` → `pnpm web db:push`(원격 적용) → `pnpm web db:types` 재생성·커밋. 버킷/스토리지 정책은 마이그레이션(0014) + 버킷 생성(대시보드/CLI). `db:check-drift`로 로컬↔원격 동기 확인.
- **모바일(Expo EAS)**: `eas build`(ios/android) + 채널별 `EXPO_PUBLIC_APP_ENV`(develop/beta/production)와 `CLIENT_URL` 매핑. 카메라/사진/마이크 권한 문자열(app.json) + 스토어 제출. OTA(`eas update`)로 JS 갱신. secret 키 미반입 재확인.
- **env 와이어링 요약**: 웹 secret = Vercel only / 모바일 = anon(publishable)만 + secure-store 런타임 토큰 / Supabase 콘솔에 Vercel 도메인을 auth `site_url`·redirect·CORS·Storage allowed origins에 등록.

---

## 14. 오픈 기술 결정 / TODO

| # | 항목 | 현재 가정(기본값) | 확정 방법 |
|---|---|---|---|
| T1 | **업로드 길이/용량 한도** | ≤ 60s / ≤ 100MB, mp4·mov | 실제 클립 측정 + Storage 비용(PRD R1) 검토 후 확정 (PRD O2) |
| T2 | **업로드 영상 썸네일 생성** | 클라이언트 첫 프레임 캡처 | Storage image-transform(Pro) vs Edge Function(ffmpeg) vs 클라 고정 — 비용/품질 비교 |
| T3 | **서명 URL 만료** | 재생 10분 / 업로드 단발 | 보안 vs 재요청 빈도 |
| T4 | **캘린더 갱신 = realtime vs polling** | TanStack Query invalidate(폴링성) | 단일 사용자라 realtime 불필요 추정. 멀티디바이스 동시편집 빈도 보고 결정 |
| T5 | **email confirmation** | 로컬 off / 프로덕션 on | 운영 정책 |
| T6 | **소셜 로그인 제공자** | 이메일 우선, 소셜 P1 | Google/Apple 필요 시 추가 |
| T7 | **`technique_category` 'defense' 단일화** | 그래플링/타격 공용 단일 값 | UI 라벨이 종목별로 갈리면 분리 검토 |
| ~~T8~~ | ✅ **해결**: 타격 세부 스타일 = `striking_style` enum(§4.3, techniques 컬럼) | — | 완료(PRD §4.1) |
| T9 | **모바일 업로드 인증 방식** | secure-store access token → /api/sign-upload | vs anon 키 + 저장 세션으로 supabase-js 직접 업로드 |
| T10 | **세션 편집 = 라우트 vs 모달** | 캘린더 위 모달(딥링크는 쿼리) | UX 검증(J1 90초 목표) |
| ~~T11~~ | ✅ **해결**: media_links/taggables = **듀얼 FK**(session_id/technique_id)+XOR → DB 무결성·자동 cascade | — | 완료 |
| T12 | **제품명/브랜드** | 가칭 RollLog | 추후 확정 (PRD O1) |
| T13 | **프리셋 기술 목록(콘텐츠)** | 종목별 8~12개(흰/파랑 위주), 가입 시 본인 소유 시드(§4.6b) | 실제 기술명·디테일 큐레이션 |
| T14 | **벨트 트랙 모델** | ✅ `rank_track`(bjj=gi·nogi 공유) — 사용자 결정 | 완료 |

---

> 본 문서는 PRD(SSoT)에 종속됩니다. 스키마/enum/메시지 타입 변경은 **PRD → Develop → 코드(마이그레이션+TS)** 순으로 동기화하고, SQL inline 상수와 TS mirror는 동일 PR에서 함께 수정합니다(기존 레포 PR 룰).
