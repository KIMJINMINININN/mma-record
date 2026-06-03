'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';

/**
 * 세션 즐겨찾기 토글 Server Action (PRD §9 P1 / 0018_favorites.sql).
 *
 * 세션 첫 UPDATE 액션(기존 logSession 은 생성 전용 RPC). 단일 컬럼 갱신이라 RPC 불필요 —
 * RLS(sessions_owns_rows: auth.uid()=user_id) 하에서 id+user_id 조건 직접 update 로 충분/안전.
 * 도먼시(인프라-last): 플래그 OFF면 안내만 반환. 성공 시 캘린더 RSC revalidate(클라 useQuery 는 아일랜드가 invalidate).
 */
export type FavoriteToggleResult =
  | { ok: true; isFavorite: boolean }
  | { ok: false; dormant?: boolean; error: string };

const INFRA_DISABLED_MESSAGE =
  '즐겨찾기는 인프라 연결(NEXT_PUBLIC_AUTH_ENABLED) 후 활성화됩니다.';

export async function toggleSessionFavorite(
  id: string,
  next: boolean,
): Promise<FavoriteToggleResult> {
  if (!isAuthEnabled()) {
    return { ok: false, dormant: true, error: INFRA_DISABLED_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  const { error } = await supabase
    .from('sessions')
    .update({ is_favorite: next })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/calendar');
  return { ok: true, isFavorite: next };
}
