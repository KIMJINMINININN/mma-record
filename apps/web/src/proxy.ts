import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { isAuthEnabled } from '@/shared/api/supabase/env';

/**
 * Proxy(구 middleware) — 세션 갱신/쿠키 회전 (Next 16 / Develop §10).
 *
 * Next 16에서 `middleware`는 `proxy`로 개명되었다(named export = `proxy`).
 * 런타임은 Node.js 기본(edge runtime 설정 금지). 매 요청 전 실행되며,
 * `@supabase/ssr` 표준 패턴으로 액세스 토큰을 갱신하고 Set-Cookie를 응답에 싣는다.
 *
 * 도먼시(dormancy): `isAuthEnabled()`가 false면 Supabase를 전혀 만지지 않고
 * `NextResponse.next()`만 반환한다 — stale Supabase로의 호출/리다이렉트 차단(인프라 last).
 * 인프라 단계에서 플래그를 켜면 그대로 세션 갱신이 동작한다.
 *
 * SSoT: docs/mma/Develop.md §10
 */
export async function proxy(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 세션 갱신(쿠키 회전). getUser()는 토큰을 서버 검증한다.
  await supabase.auth.getUser();
  return supabaseResponse;
}

export const config = {
  matcher: [
    // `share`(공유 공개 링크)는 제외 — 익명이 로그인 없이 열어야 하므로 세션 갱신 대상에서 뺀다(F11).
    '/((?!_next/static|_next/image|favicon.ico|api|share|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
