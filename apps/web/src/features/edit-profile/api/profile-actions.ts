'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { profileUpdateSchema, type ProfileUpdate } from '@/entities/profile';
import { userRankUpsertSchema, type UserRankUpsert } from '@/entities/rank';

/**
 * 프로필 / 랭크 편집 Server Actions (F1-AC3·AC4 / Develop §0003·§0004).
 *
 * 도먼시(dormancy): 플래그 OFF면 stale Supabase로 호출하지 않고 안내만 반환한다
 * ((auth)/actions.ts · log-session-action.ts 패턴 미러). 인프라 단계에서 플래그를 켜면 그대로 동작.
 *
 * profiles.update / user_ranks.upsert는 RLS(소유자 한정)로 보호된다 — user_id 조건/페이로드는 getUser()로 채운다.
 */

/** 편집 액션 공통 결과 — 클라이언트 폼이 토스트 분기에 사용. */
export type EditResult = { ok: true } | { ok: false; dormant?: boolean; error: string };

const PROFILE_DISABLED_MESSAGE =
  '프로필 저장은 인프라 연결(NEXT_PUBLIC_AUTH_ENABLED) 후 활성화됩니다.';
const RANK_DISABLED_MESSAGE =
  '랭크 저장은 인프라 연결(NEXT_PUBLIC_AUTH_ENABLED) 후 활성화됩니다.';

/**
 * 표시명 + 타임존 저장 (F1-AC3) → `profiles` update.
 * 표시명/타임존 외 컬럼은 건드리지 않으며, RLS가 본인 행만 허용한다.
 */
export async function updateProfile(rawInput: ProfileUpdate): Promise<EditResult> {
  const parsed = profileUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' };
  }
  const input = parsed.data;

  if (!isAuthEnabled()) {
    return { ok: false, dormant: true, error: PROFILE_DISABLED_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  // db:types 생성(인프라) 후 실타입 — .from('profiles') 제네릭이 Update 컬럼을 안다.
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: input.display_name, timezone: input.timezone })
    .eq('user_id', user.id);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/profile');
  return { ok: true };
}

/**
 * 종목(랭크 트랙)별 랭크 저장 (F1-AC4) → `user_ranks` upsert(unique(user_id, track)).
 * bjj 트랙은 belt+stripes, 비bjj 트랙은 level. 트랙당 1행이며 충돌 시 갱신한다.
 */
export async function upsertRank(rawInput: UserRankUpsert): Promise<EditResult> {
  const parsed = userRankUpsertSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' };
  }
  const input = parsed.data;

  if (!isAuthEnabled()) {
    return { ok: false, dormant: true, error: RANK_DISABLED_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  // db:types 생성(인프라) 후 실타입 — .from('user_ranks') 제네릭이 Insert 컬럼을 안다.
  const row = { user_id: user.id, ...input };
  const { error } = await supabase
    .from('user_ranks')
    .upsert(row, { onConflict: 'user_id,track' });
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/profile');
  return { ok: true };
}
