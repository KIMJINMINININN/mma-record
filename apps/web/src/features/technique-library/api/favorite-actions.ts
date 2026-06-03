'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';

/**
 * 기술 즐겨찾기 토글 Server Action (PRD §9 P1 / 0018_favorites.sql).
 *
 * 도먼시(인프라-last): 플래그 OFF면 stale Supabase 호출 없이 안내만 반환(technique-actions.ts 미러).
 * RLS(소유자 한정): id + user_id 조건으로 본인 기술만 갱신.
 * 단일 컬럼 update — 별표 토글 전용이라 techniqueInsertSchema(생성/편집 입력)와 분리된 액션.
 * 이 feature(technique-library)가 소비처(TechniqueLibrary/DetailView)와 함께 액션을 소유한다
 * (edit-technique 에 두면 feature→feature import 가 되므로 여기 co-locate).
 */
export type FavoriteToggleResult =
  | { ok: true; isFavorite: boolean }
  | { ok: false; dormant?: boolean; error: string };

const INFRA_DISABLED_MESSAGE =
  '즐겨찾기는 인프라 연결(NEXT_PUBLIC_AUTH_ENABLED) 후 활성화됩니다.';

export async function toggleTechniqueFavorite(
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
    .from('techniques')
    .update({ is_favorite: next })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/techniques');
  return { ok: true, isFavorite: next };
}
