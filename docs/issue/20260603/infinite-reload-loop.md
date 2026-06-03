# 무한 리로딩 — Dev 서버 무한 리빌드/리로드 루프

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-06-03 |
| 심각도 | High (로컬 개발 전면 차단) |
| 영역 | `apps/web` · Next.js 16 (Turbopack) dev 서버 |
| 상태 | ✅ 해결 |
| 트리거 | 실행 중인 dev 서버 밑에서 `rm -rf node_modules && pnpm install` |

## TL;DR
켜져 있던 dev 서버(`:3000`, Turbopack) 밑에서 `node_modules`를 통째로 재설치하는 바람에, 파일 워처가 대량 변경을 감지하고 `.next` 증분 빌드 캐시가 손상되어 **재빌드 → 풀 페이지 리로드 → 재빌드** 무한 루프에 빠졌다. **dev 정지 → `apps/web/.next` 삭제 → 재기동**으로 해결. 소스/코드 문제가 아닌 운영상 사고.

## 증상
- `localhost:3000` 페이지가 계속 풀 리로드되어 사용 불가(무한).
- 자동화 브라우저로 점검할 때도 페이지가 반복적으로 "execution context destroyed by navigation" 으로 분리됨 — 동일 증상.

## 원인 (연쇄)
1. **shadcn `add` CLI 비호환** — 이 pnpm `node-linker=hoisted` 모노레포에서 `shadcn add` 가 `pnpm add` 를 워크스페이스 컨텍스트 없이 실행 → `react`/`react-dom`/`dotenv` 를 `node_modules/.ignored` 로 격리(node_modules 손상).
2. **복구용 재설치** — 위를 정상화하려고 `rm -rf node_modules && pnpm install` 실행.
3. **타이밍** — 그 시점에 dev 서버(`:3000`, Next 16 / Turbopack)가 **실행 중**이었다.
4. **워처 + 캐시 손상** — Turbopack 파일 워처가 node_modules 전체의 소멸→재생성을 대량 변경으로 감지했고, 그 와중에 `.next`(증분 빌드 캐시)가 불일치·손상됨.
5. **루프** — 서버가 안정 상태로 수렴하지 못하고 재빌드와 풀 페이지 리로드를 무한 반복.

## 증거 (어떻게 확정했나)
- **콘솔**: `[Fast Refresh] rebuilding` 가 반복 출력. **런타임 에러는 0건** (Invalid hook call 등 없음).
- **네트워크**: `/login` 문서 요청이 `[200]` 직후 다시 `[pending]` 으로 재요청됨 → 풀 페이지 리로드 루프 확정.
- **역검증**: `.next` 삭제 + 재기동 직후 루프가 즉시 사라짐 → 원인이 캐시/서버 상태 손상임을 입증.

## 조치 (fix)
1. 루프 중인 dev 서버 정지 — `turbo`/`next` 프로세스 종료
   (`pkill -f "turbo run dev"`, `pkill -f "next dev"`, 포트 3000 정리).
2. 손상된 캐시 삭제 — `rm -rf apps/web/.next`.
3. 깨끗한 dev 서버 재기동.

## 검증
- `✓ Ready in 327ms`, dev 로그 9줄(루프성 로그 **0줄**).
- `/login` 문서 요청 **1회** `[200]`, 콘솔은 `[HMR] connected` 만.
- 일정 시간 경과 후에도 안정(200 유지, 루프 없음).

## 코드 문제가 아니었음 (배제 항목)
| 의심 | 결과 |
|------|------|
| shadcn 토큰 브리지 / CSS | build·렌더 정상 → 무관 |
| react-dom 중복 (루트 + `apps/web` 복사본) | 프레시 서버에서 안정, 런타임 에러 0 → 무관 |
| `--spacing` 0.25rem 변경 | CSS 값일 뿐 → 무관 |

→ 순수하게 "실행 중인 dev 서버 밑에서 의존성 재설치" 라는 운영상 사고.

## 재발 방지
- **dev 서버가 켜진 상태에서 `node_modules` 를 변경하지 않는다.** 의존성 작업이 필요하면 **dev 정지 → 작업 → 재기동** 순서로.
- 유사한 리로드 루프 발생 시 표준 복구: **dev 정지 → `rm -rf apps/web/.next` → 재기동**.
- (배경) shadcn 컴포넌트는 `shadcn add` CLI 대신 수동으로 추가한다 — `pnpm --filter @the-others/web add <pkg>` 후 레지스트리 소스를 `src/shared/ui/shadcn/` 에 복사. (node_modules 손상의 1차 원인이 이 CLI였음.)

## 참고
- 본 이슈는 shadcn/ui 도입 작업 중 발생.
- node_modules / 테스트 단일 React 인스턴스 관련 배경은 `apps/web/scripts/link-test-react.mjs` 주석 및 세션 메모리 참고.
