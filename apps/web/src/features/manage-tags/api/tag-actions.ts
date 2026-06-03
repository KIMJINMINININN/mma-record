'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { tagUpdateSchema, type TagUpdate } from '@/entities/tag';

/**
 * 태그 관리 Server Actions (F7-AC4 rename + recolor + delete).
 *
 * 도먼시(인프라-last): 플래그 OFF면 stale Supabase 호출 없이 안내만 반환(technique-actions.ts 패턴).
 * tags update/delete 는 RLS(tags_owns_rows)로 보호 — id + user_id(getUser) 조건으로 본인 행만.
 * rename 충돌(unique(user_id,name) → 23505)은 병합하지 않고 친절한 메시지로 거부(잠금 결정).
 * taggables 는 tags FK ON DELETE CASCADE → 태그 삭제 시 링크 자동 제거.
 */

export type TagActionResult = { ok: true } | { ok: false; dormant?: boolean; error: string };

const INFRA_DISABLED_MESSAGE = '태그 편집은 인프라 연결(NEXT_PUBLIC_AUTH_ENABLED) 후 활성화됩니다.';
const DUP_NAME_MESSAGE = '같은 이름의 태그가 이미 있습니다. 다른 이름을 사용하세요.';

/** 태그 이름/색 수정 (F7-AC4). 부분 수정(name/color 각각 선택). */
export async function updateTag(id: string, raw: TagUpdate): Promise<TagActionResult> {
  const parsed = tagUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' };
  }
  const input = parsed.data;

  if (!isAuthEnabled()) {
    return { ok: false, dormant: true, error: INFRA_DISABLED_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  // 정의된 필드만 patch(부분 수정).
  const patch: { name?: string; color?: string | null } = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.color !== undefined) patch.color = input.color;

  const { error } = await supabase.from('tags').update(patch).eq('id', id).eq('user_id', user.id);
  if (error) {
    // 23505 = unique(user_id,name) 위반(이름 충돌) → 병합 대신 거부 안내(메시지 폴백 포함).
    if (error.code === '23505' || error.message?.includes('duplicate key')) {
      return { ok: false, error: DUP_NAME_MESSAGE };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath('/tags');
  return { ok: true };
}

/** 태그 삭제 (F7-AC4). taggables 는 CASCADE로 자동 정리. */
export async function deleteTag(id: string): Promise<TagActionResult> {
  if (!isAuthEnabled()) {
    return { ok: false, dormant: true, error: INFRA_DISABLED_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  const { error } = await supabase.from('tags').delete().eq('id', id).eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/tags');
  return { ok: true };
}
