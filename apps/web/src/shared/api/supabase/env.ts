/**
 * 인증 활성화 스위치 (F1 / Develop §10).
 *
 * WHY 전용 플래그(`NEXT_PUBLIC_AUTH_ENABLED`)인가 — "Supabase URL 존재"로 게이팅하지 않는 이유:
 *   현재 `.env.local`에는 **다른(레퍼런스) 프로젝트**의 stale Supabase 값이 남아 있다.
 *   따라서 URL/키 존재 여부로 인증을 켜면, 실제 MMA 프로젝트가 아닌 엉뚱한 백엔드로
 *   네트워크 호출이 나갈 수 있다. 그래서 인증 가드·세션 미들웨어·서버액션은
 *   오직 이 **단일 의도 스위치** 하나로만 켠다.
 *
 * 인프라(실 Supabase 연결) 단계에서 실제 MMA 프로젝트 값과 함께 이 플래그를 `true`로 뒤집는다.
 * 그 전까지(false/미설정)는 앱 셸을 탐색 가능한 상태로 유지한다(인프라 last 제약).
 *
 * NOTE: `'server-only'`를 붙이지 않는다 — 단순 env 읽기이며 proxy/layout/actions
 *       (서버) 어디서든 안전하게 호출된다. server-only 배럴(`./index`)에서 re-export 하지 말 것
 *       (그 배럴은 server-only 모듈만 노출하므로). 필요한 곳에서 이 파일을 직접 import 한다.
 *
 * SSoT: docs/mma/Develop.md §10
 */
export function isAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
}
