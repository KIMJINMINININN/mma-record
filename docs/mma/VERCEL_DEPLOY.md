# VERCEL_DEPLOY — MatLog 웹앱(apps/web) 배포 런북

> MatLog = MMA·주짓수·그래플링·타격 훈련 저널. `apps/web`(Next.js 16 + Supabase)을 Vercel에 배포한다.
> 코드는 **P0(F1~F9) 전부 완성**. 남은 건 **인프라(이 문서) — 대부분 대시보드 작업**이다.
> SSoT: `docs/mma/{PRD,Design,Develop}.md` · 진행상태: `docs/mma/TodoList.md` 상단 🟢 블록.

---

## 0. 🔒 보안 (먼저 읽기 — 절대)

- **시크릿(`sb_secret_…`·`sb_publishable_…`·실 Supabase URL/ref/프로젝트명)은 채팅/커밋/이 문서에 절대 쓰지 않는다.**
  값은 오직 **`.env.local`(gitignore)** 와 **Supabase·Vercel 대시보드**에만 존재한다. `.env.local`은 읽지도 노출하지도 않는다.
- **이 레포는 공개(mirror)일 수 있다** → 실 백엔드 ref/키/레퍼런스 브랜드 식별자 커밋 금지.
- 이 문서의 도메인/키는 전부 **placeholder**(`<your-project>.vercel.app`, `sb_publishable_…`)다. 실제 값으로 치환하지 말고 대시보드에 직접 입력.

---

## 1. 사전 점검 (로컬, 배포 전 1회)

Vercel 원격 빌드는 아래와 동일한 `pnpm install` → `next build`를 돈다. **로컬에서 먼저 green을 확인해 원격에서 헤매지 않는다.**

```bash
# 레포 루트에서
pnpm install                 # 모노레포 워크스페이스 전체 설치 (pnpm@10.33.0, node>=20)
pnpm web typecheck           # tsc --noEmit
pnpm web lint                # eslint
pnpm web build               # next build  ← 이게 통과하면 Vercel 빌드도 통과할 확률 높음
```

체크:
- [ ] `pnpm-lock.yaml`이 커밋되어 있다(결정적 설치). — 현재 ✅ 루트에 존재
- [ ] 위 3개 게이트 전부 green.
- [ ] 배포 브랜치 확인: **이 단독 레포는 `main`** (모노레포 시절 `feature/mma-record` 아님).

> 빌드는 `NEXT_PUBLIC_AUTH_ENABLED`가 없거나 false여도 **dormant 모드**로 성공한다(실 Supabase 무접촉). 실 동작은 프로덕션 env에서 `true`로 켠다.

---

## 2. Vercel 프로젝트 Import & 설정

**New Project → 이 Git 레포 import → 아래 설정.** (Settings에서 나중에 변경 가능하나, env는 첫 빌드 전 권장 — §3 참고.)

| 설정 | 값 | 위치 |
|---|---|---|
| **Root Directory** | ⭐ **`apps/web`** | Settings → General → Root Directory |
| Include files outside root | **ON**(기본) | 위와 같은 화면 — 워크스페이스 패키지(`@the-others/webview-protocol`) 해석에 필수 |
| Framework Preset | **Next.js** (자동감지) | General |
| Node.js Version | **20.x** 이상 (루트 `engines.node >=20`) | Settings → General → Node.js Version |
| Package Manager | **pnpm** (자동감지: 루트 `packageManager: pnpm@10.33.0` + lockfile) | — |
| Install Command | **`apps/web/vercel.json`가 지정**(`cd ../.. && pnpm install`) — 대시보드 override 불필요 | (커밋됨 `7a69ba7`) |
| Build Command | **`apps/web/vercel.json`가 지정**(`cd ../.. && pnpm --filter @the-others/web build`) | (커밋됨 `7a69ba7`) |
| Output Directory | 기본값(`.next`) | Build & Deployment |
| **Production Branch** | **`main`** | Settings → Git → Production Branch |

> **왜 Root Directory=`apps/web` + include-outside-root인가:** `next.config.ts`가 워크스페이스 패키지 `@the-others/webview-protocol`을 `transpilePackages`로 빌드하고 Turbopack root를 모노레포 루트로 둔다. Vercel은 lockfile을 루트에서 감지해 워크스페이스 전체를 설치한 뒤 `apps/web`에서 빌드해야 의존성이 풀린다. (모노레포면 "include files outside the root directory"는 기본 ON.)
>
> ⚠️ **중요(검증됨):** pnpm v10는 `apps/web`에서 실행되면 **워크스페이스 루트를 못 찾아** `@the-others/webview-protocol@workspace:*` 해석에 실패한다(`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`). 게다가 `.npmrc`의 `node-linker=hoisted` 때문에 `next` 바이너리도 **루트** `node_modules/.bin`에만 있다. → install/build를 **레포 루트에서** 돌려야 하며, 이를 **`apps/web/vercel.json`** 가 명시한다(`cd ../.. && …`). 대시보드에서 따로 override하지 말 것 — vercel.json이 우선한다(§8-G).

---

## 3. 환경변수 (Settings → Environment Variables)

**첫 빌드 전에 Production(필요시 Preview)에 넣는다.** `NEXT_PUBLIC_*`는 **빌드 시 번들에 인라인**되므로, 나중에 바꾸면 **반드시 Redeploy** 해야 반영된다(§8-A).

| 변수 | 예시/값 | Scope | 민감 | 비고 |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Production(+Preview) | — | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Production(+Preview) | — | 신규 키 형식만(legacy anon JWT 금지) |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` | Production(+Preview) | 🔒 **Sensitive** | 서버 전용. 신규 키 형식(legacy service_role JWT 금지) |
| `NEXT_PUBLIC_AUTH_ENABLED` | `true` | Production | — | **프로덕션은 반드시 `true`** (인증/세션 미들웨어 점등) |
| `NEXT_PUBLIC_MEDIA_BUCKET` | `training-media` | Production | — | 선택(코드 기본값 동일). Supabase 버킷명과 일치해야 함 |
| `NEXT_PUBLIC_UPLOAD_MAX_BYTES` | `104857600` | Production | — | 선택. 기본 100 MiB |
| `NEXT_PUBLIC_UPLOAD_MAX_DURATION_SEC` | `60` | Production | — | 선택. 기본 60s |
| `YOUTUBE_API_KEY` | `…` | Production | 🔒 | **선택/P1.** 유튜브 *임베드*는 키 불필요. `/api/youtube/search`(P1) 쓸 때만 |

**넣지 말 것:** `E2E_SUPABASE_*` (로컬 Playwright 전용). 실 시크릿을 채팅/커밋에 노출 금지.

> Preview 배포에서도 로그인을 테스트하려면 같은 4개를 Preview scope에도 넣고, §4의 Supabase Redirect URLs에 Preview 도메인(또는 와일드카드)을 추가한다.

---

## 4. Supabase 대시보드 설정

### 4a. Auth URL Configuration  (Authentication → URL Configuration)
- **Site URL** = 프로덕션 도메인 (예: `https://<your-project>.vercel.app` 또는 커스텀 도메인)
- **Redirect URLs** = 위 도메인 추가. 이메일 확인/소셜 콜백이 이 목록과 일치해야 함.
  - 예: `https://<your-project>.vercel.app/**`
  - (선택) Preview 배포도 쓰면: `https://*-<scope>.vercel.app/**`
  - (커스텀 도메인 있으면) `https://<custom-domain>/**`

### 4b. Storage 버킷 (Storage)
- `NEXT_PUBLIC_MEDIA_BUCKET`(기본 `training-media`)와 **이름이 같은 버킷**이 존재하고 **private**인지 확인.
  (마이그레이션에서 생성됨 — 없으면 동일 이름의 private 버킷 생성.)
- 재생은 **소유자 SELECT RLS + 경로 `<uid>/videos/…` 일치** 조건의 `createSignedUrl`로 동작(§8-C).

### 4c. 마이그레이션/시드 확인
- 원격에 0001~0016 적용 + **프리셋(기술) 시드 라이브**여야 한다(아래 §6 검증의 "프리셋" 항목).

---

## 5. 배포 실행 & 재배포 규칙

1. §2~§4 완료 후 **Deploy**. (또는 `main`에 푸시하면 프로덕션 배포 트리거.)
2. **`NEXT_PUBLIC_*` 변경 시 → Deployments → 최신 → Redeploy** (빌드 인라인이라 재빌드 필수).
3. 서버 전용 변수(`SUPABASE_SECRET_KEY`, `YOUTUBE_API_KEY`)는 런타임 주입이라 즉시 반영(런타임 재시작), 단 빌드 캐시 영향 없으면 보통 Redeploy 불필요.

---

## 6. 배포 후 검증 체크리스트

프로덕션 도메인에서 순서대로:
- [ ] `/login` → 회원가입/로그인 동작 (이메일 확인 분기 시 메일 링크가 Site URL로 옴 → §4a).
- [ ] 로그인 후 `/techniques` → **프리셋 41종**이 보인다(시드 라이브 확인).
- [ ] 세션 기록(FAB) → 저장 → `/calendar` 그날 셀에 반영(쿼리 invalidate).
- [ ] 세션/기술 **미디어**: 유튜브 임베드 재생 + 파일 업로드(sign→PUT→`media_assets`→서명URL 재생) 동작.
- [ ] **태그**: attach + AND 필터 + 표시. **글로벌 검색**: `/search?q=` 결과 그룹.
- [ ] **딥링크**: `/calendar?date=YYYY-MM-DD` 진입 시 해당 날짜 선택.
- [ ] 콘솔/네트워크: "URL and Key required" 류 에러 없음(§8-A).

---

## 7. 모바일 연결 (apps/mobile)

- `apps/mobile/config/env.ts`의 per-env `CLIENT_URL` placeholder(`example.com`)를 **실 Vercel 도메인**으로 교체,
  또는 빌드/실행 시 `EXPO_PUBLIC_CLIENT_URL=https://<your-project>.vercel.app`로 오버라이드.
  ```bash
  EXPO_PUBLIC_CLIENT_URL=https://<your-project>.vercel.app pnpm --filter @the-others/mobile start
  ```
- ↪ 후속(순수 배포 범위 밖, TodoList §7): 웹측이 로그인/로그아웃 시 `AUTH_*` postMessage 발신 · 네이티브 secure-store 토큰 보관 · MEDIA_* 브릿지(P1).

---

## 8. 트러블슈팅 (자주 만나는 gotcha)

**A. 서버액션은 되는데 클라 읽기만 "URL and Key required" / Supabase URL·Key 누락**
→ `NEXT_PUBLIC_*`가 **빌드 시 인라인**인데 빌드 후 추가/변경됨. **env를 빌드 전에 넣고, 바꿨으면 Redeploy.** (dev에선 `.env.local` 수정 후 서버 재시작.)

**B. 모노레포 install 실패 / `@the-others/webview-protocol` 해석 불가**
→ Root Directory가 `apps/web`인지, "include files outside root"가 ON인지, Vercel이 pnpm 워크스페이스를 감지했는지(루트 lockfile + `packageManager`) 확인. Install/Build Command를 커스텀으로 덮어 `cd` 했다면 워크스페이스 루트를 벗어났을 수 있음 → 기본값으로 되돌리기.

**C. 업로드한 영상이 재생 안 됨(서명 URL 401/403)**
→ 버킷이 **private**이고, 객체 경로가 **`<uid>/videos/…`** 형태로 업로더 uid와 일치하며, **소유자 SELECT RLS**가 있는지 확인. `createSignedUrl` 만료시간도 확인.

**D. Node 버전 에러**
→ Vercel Settings → Node.js Version을 **20.x 이상**으로.

**E. 빌드는 되는데 런타임에 인증/세션 동작 안 함**
→ 프로덕션 env에 `NEXT_PUBLIC_AUTH_ENABLED=true`가 있는지(없으면 dormant). 미들웨어는 `apps/web/src/proxy.ts`(Next 16, 구 middleware).

**F. PostgREST 임베드 결과 형태 혼란(객체 vs 배열)**
→ NOT NULL FK는 단일 객체, 역방향/nullable은 배열. (코드에서 이미 처리 — 새 쿼리 추가 시 주의.)

**G. `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` / `Packages found in the workspace:` 가 비어있음** ⭐
→ pnpm v10가 Root Directory(`apps/web`)에서 `pnpm install`되면서 워크스페이스 루트(`pnpm-workspace.yaml`)를 못 찾는 게 원인. 해결: **`apps/web/vercel.json`** 가 install/build를 `cd ../..`로 루트에서 실행(커밋 `7a69ba7`). 재발 시 체크 — ① 배포된 커밋에 `apps/web/vercel.json`이 있는지 ② 빌드 로그의 install 줄이 `cd ../.. && pnpm install`로 바뀌었는지 ③ 실패한 옛 배포를 "Redeploy"하면 옛 설정/커밋을 재사용하니, **새 커밋으로 새 배포**를 돌릴 것. (로컬 재현: `git archive HEAD | tar -x -C /tmp/x && cd /tmp/x/apps/web && pnpm install` → 동일 에러)

---

## 부록: 빠른 체크리스트

```
[ ] 로컬: pnpm install / typecheck / lint / build 모두 green
[ ] Vercel: Root=apps/web · Node 20+ · Production Branch=main
[ ] Vercel env(빌드 전): NEXT_PUBLIC_SUPABASE_URL · _PUBLISHABLE_KEY · SUPABASE_SECRET_KEY(🔒) · NEXT_PUBLIC_AUTH_ENABLED=true
[ ] Supabase: Site URL + Redirect URLs = Vercel 도메인
[ ] Supabase: private 버킷(training-media) + 0001~0016 + 프리셋 시드
[ ] Deploy → §6 검증 체크리스트 통과
[ ] 모바일 CLIENT_URL = 실 Vercel 도메인
```
