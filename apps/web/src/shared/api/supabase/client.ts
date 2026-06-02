'use client';

import { createBrowserClient } from '@supabase/ssr';

import type { Database } from './types';

/**
 * 브라우저용 Supabase 클라이언트 (클라이언트 컴포넌트).
 *
 * publishable 키만 사용한다(브라우저 노출 안전, Develop §3.3).
 * TanStack Query 뮤테이션 · 글로벌 검색 RPC 등 상호작용 데이터에 사용.
 *
 * SSoT: docs/mma/Develop.md §6b
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
