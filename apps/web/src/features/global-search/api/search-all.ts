import 'server-only';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';

import type { SearchResult } from '../model/search';

/**
 * 글로벌 검색 (F8 / Develop §0012 search_all). RSC에서 호출되는 server util.
 *
 * 도먼시(인프라 last): 빈 쿼리이거나 플래그(NEXT_PUBLIC_AUTH_ENABLED) OFF면
 * Supabase **무접촉**으로 `[]` 반환 — client 생성·rpc 호출 없음
 * (log-session-action.ts / api/media/sign-upload/route.ts 도먼시 패턴과 동일).
 * 인프라 단계에서 플래그를 켜면 실 RPC로 그대로 동작한다.
 *
 * SSoT: docs/mma/Develop.md §0012 / §4.7
 */
export async function searchAll(query: string, limit = 30): Promise<SearchResult[]> {
  const q = query.trim();
  if (q === '' || !isAuthEnabled()) return [];

  const supabase = await createSupabaseServerClient();

  // db:types 생성(인프라) 후 실타입 — rpc 제네릭이 'search_all'(Returns 행 배열)을 안다.
  const { data, error } = await supabase.rpc('search_all', { p_query: q, p_limit: limit });
  if (error || !data) return [];

  // 생성된 Returns 는 result_type:string·subtitle:string 으로 넓다.
  // RPC 계약상 result_type 은 'technique'|'session'|'tag' 만 나오므로 SearchResult 로 좁힌다(Develop §0012).
  return data.map((row) => ({
    result_type: row.result_type as SearchResult['result_type'],
    result_id: row.result_id,
    title: row.title,
    subtitle: row.subtitle,
    belt: row.belt,
    rank: row.rank,
  }));
}
