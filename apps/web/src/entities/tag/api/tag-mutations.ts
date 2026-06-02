import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/api/supabase/types';

/**
 * 태그 쓰기 helper(서버 측) — PRD F7 / Develop §9 (tags/taggables 영속화, #6-1 attach).
 *
 * 클라이언트를 **만들지 않고** 인자로 받는 순수 helper다(서버 액션이 자신의 server client를 넘긴다) →
 * 'server-only' 런타임 의존이 없어 배럴로 노출해도 클라 번들을 오염시키지 않는다(미사용 시 tree-shake).
 * 호출부: logSession / createTechnique / updateTechnique 서버 액션.
 */

/**
 * 태그 이름 배열 → tag id 배열 (find-or-create).
 *
 * `tags.unique(user_id, name)` 기준으로 누락분만 upsert(ignoreDuplicates)해 생성한 뒤,
 * 본인 소유 + 해당 이름 행의 id를 기존·신규 모두 모아 돌려준다. RLS(tags_owns_rows)로 본인 행만 —
 * server client는 쿠키 세션으로 인증되어 있고 user_id가 auth.uid()와 일치해야 한다.
 *
 * 이름은 trim + 빈문자 제거 + **정확일치** 중복 제거(대소문자 보존 — DB unique 기준과 동일).
 */
export async function resolveTagIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  rawNames: string[],
): Promise<string[]> {
  const names = Array.from(new Set(rawNames.map((n) => n.trim()).filter(Boolean)));
  if (names.length === 0) return [];

  // 누락분 생성(이미 있으면 무시). user_id는 RLS check(auth.uid()=user_id)와 일치해야 한다.
  const { error: upsertErr } = await supabase
    .from('tags')
    .upsert(
      names.map((name) => ({ user_id: userId, name })),
      { onConflict: 'user_id,name', ignoreDuplicates: true },
    );
  if (upsertErr) throw upsertErr;

  // 기존 + 신규 전체 id 수집.
  const { data, error } = await supabase
    .from('tags')
    .select('id')
    .eq('user_id', userId)
    .in('name', names);
  if (error) throw error;
  return (data ?? []).map((t) => t.id);
}
