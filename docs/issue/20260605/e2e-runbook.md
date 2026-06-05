# e2e 실행 런북 (2026-06-05) — 사장님용

> 하니스는 **이미 완성**이고 현재 UI 대비 **셀렉터 감사 통과**(드리프트 0). 전용 테스트 계정만 있으면 바로 실행된다.
> 파일: `apps/web/playwright.config.ts` · `apps/web/e2e/auth.setup.ts`(로그인→storageState) · `apps/web/e2e/smoke.spec.ts`.

## 감사 결과 (2026-06-05) — 전부 현재 UI와 일치, 수정 불필요
- 로그인: `label="이메일"`·`label="비밀번호"`·버튼 `로그인` (login-form.tsx) ✅
- FAB: `aria-label="세션 추가"` (QuickAddFab) ✅
- 다이얼로그: `role="dialog"` (SessionEditorHost) ✅
- 종목: `주짓수 (기)` (discipline-meta bjj_gi) + aria-pressed ✅
- 세션 폼: `세부 정보 (선택)` 토글 · `메모`/`se-memo` · `저장` 버튼 · `저장됨` 토스트 ✅

## 실행 순서
1. **전용 테스트 계정 생성** (⚠ prod에 실데이터[세션]를 씀, 자동 정리 없음 → 반드시 일회용/전용 계정).
   - prod Supabase Auth 또는 대시보드에서 이메일 가입(`NEXT_PUBLIC_AUTH_ENABLED=true` 환경).
2. **`apps/web/.env.test`** 작성 (gitignore, 미커밋):
   ```
   E2E_USER_EMAIL=<테스트계정 이메일>
   E2E_USER_PASSWORD=<비밀번호>
   # (선택) 배포 사이트 대상으로 실행. 없으면 로컬 next dev 자동 기동(.env.local의 실 Supabase 사용).
   E2E_BASE_URL=https://<prod-vercel-도메인>
   ```
   - `E2E_BASE_URL` 미설정 시: 로컬 `pnpm dev`(:3000)를 자동 기동해 그 대상으로 실행(앱은 `.env.local` Supabase 사용).
   - 설정 시: 그 URL(배포 prod 등) 대상으로 바로 실행(next dev 안 띄움).
3. **실행**: `pnpm --filter @the-others/web e2e` (또는 `pnpm web e2e`). UI 모드: `pnpm web e2e:ui`.
   - 자격증명 없으면 전 테스트 graceful skip(빈 storageState 생성, ENOENT 방지) — 이미 검증됨.

## 현재 커버리지 (스모크)
- A. 인증 세션 유효(`/calendar` 진입, /login 리다이렉트 안 됨, FAB 보임).
- B. 세션 생성 플로우(FAB→다이얼로그→종목 선택→메모→저장→`저장됨` 토스트→다이얼로그 닫힘).

## 확장(후속, 계정 생긴 뒤 실행하며 검증 권장)
- 기술 라이브러리 목록 로드·필터 / 글로벌 검색 / 즐겨찾기 토글 / 캘린더 주·아젠다 뷰.
- ⚠ 미실행 상태로 테스트를 추가하면 셀렉터 오류를 현장에서 맞을 수 있어, **계정 확보 후 각 케이스를 돌려보며 추가**하는 게 안전(이번엔 의도적으로 미추가).
- prod 오염 최소화: 읽기 전용 네비게이션 위주로 확장하고, 쓰기(세션/기술 생성)는 식별 가능한 prefix + 주기 정리 고려.
