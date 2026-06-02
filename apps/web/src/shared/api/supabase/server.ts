import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from './types';

/**
 * 서버용 Supabase 클라이언트 (RSC · Server Action · Route Handler).
 *
 * 쿠키 세션 기반으로 RLS가 적용된다. publishable 키 사용(신규 키 체계, Develop §3.3).
 * Next 16의 `cookies()`는 async이므로 `await`로 호출한다.
 *
 * SSoT: docs/mma/Develop.md §6b / §10
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Component 렌더 중에는 쿠키 set이 막힐 수 있다.
          // 세션 갱신은 미들웨어(src/proxy.ts)가 담당하므로 여기선 무시한다.
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            /* RSC 렌더 중 set 시도 — 미들웨어가 처리 */
          }
        },
      },
    },
  );
}
