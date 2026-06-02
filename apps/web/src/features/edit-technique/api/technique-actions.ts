'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { techniqueInsertSchema, type TechniqueInsert } from '@/entities/technique';
import { resolveTagIds } from '@/entities/tag';

/**
 * 기술 생성/편집 Server Actions (F4-AC1 / Design §7d, 0005_techniques.sql).
 *
 * 도먼시(dormancy, 인프라-last): 플래그 OFF면 **stale Supabase로 호출하지 않고** 안내만 반환한다
 * ((auth)/actions.ts · log-session-action.ts · profile-actions.ts 패턴 미러).
 * 인프라 단계에서 NEXT_PUBLIC_AUTH_ENABLED 를 켜면 그대로 INSERT/UPDATE 가 동작한다.
 *
 * techniques.insert / update 는 RLS(소유자 한정)로 보호된다 — user_id 조건/페이로드는 getUser()로 채운다.
 * 태그(F7)는 tagNames로 받아 resolveTagIds(이름→tags 행)로 해석 후 taggables에 연결한다(#6-1).
 * 미디어(F5)는 mediaIds(이미 생성된 media_assets id)를 받아 media_links에 연결한다(#6-4):
 *  - 업로드/youtube 자산 생성은 클라(persistMediaDrafts)가 먼저 끝내고 id만 넘긴다.
 *  - 생성: media_links insert. 편집: 기존 기술 taggables/media_links 전체 삭제 후 desired 재삽입(재동기화).
 *    편집 폼이 기존 태그·미디어를 prefill하므로 빈 배열로 실수로 지워지지 않는다(canSave 게이트).
 */

/** 기술 액션 결과 — 클라이언트 폼이 토스트 분기(ok/dormant/error)에 사용. */
export type TechniqueActionResult =
  | { ok: true; techniqueId: string }
  | { ok: false; dormant?: boolean; error: string };

const INFRA_DISABLED_MESSAGE =
  '기술 저장은 인프라 연결(NEXT_PUBLIC_AUTH_ENABLED) 후 활성화됩니다.';

/**
 * 기술 생성 (F4-AC1) → `techniques` insert(소유자 = getUser()).
 * visibility 는 입력에서 생략 시 DB default 'private' 이지만, 폼이 명시적으로 'private' 을 보낸다.
 */
export async function createTechnique(
  rawInput: TechniqueInsert,
  tagNames: string[] = [],
  mediaIds: string[] = [],
): Promise<TechniqueActionResult> {
  const parsed = techniqueInsertSchema.safeParse(rawInput);
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

  // db:types 생성(인프라) 후 실타입 — .from('techniques') 제네릭이 Insert 컬럼을 안다.
  const row = { user_id: user.id, ...input };
  const { data, error } = await supabase
    .from('techniques')
    .insert(row)
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? '기술 저장에 실패했습니다.' };
  }

  // 태그 연결(#6-1): 이름→tag id(없으면 생성)→taggables insert. 새 기술이라 충돌 없음.
  const tagIds = await resolveTagIds(supabase, user.id, tagNames);
  if (tagIds.length > 0) {
    const { error: tagErr } = await supabase
      .from('taggables')
      .insert(tagIds.map((tag_id) => ({ tag_id, technique_id: data.id })));
    if (tagErr) return { ok: false, error: tagErr.message };
  }

  // 미디어 연결(#6-4): 이미 생성된 media_assets id → media_links insert. 새 기술이라 충돌 없음.
  if (mediaIds.length > 0) {
    const { error: mediaErr } = await supabase
      .from('media_links')
      .insert(mediaIds.map((media_id) => ({ media_id, technique_id: data.id })));
    if (mediaErr) return { ok: false, error: mediaErr.message };
  }

  revalidatePath('/techniques');
  return { ok: true, techniqueId: data.id };
}

/**
 * 기술 편집 (F4-AC1) → `techniques` update(id + user_id 조건, RLS 본인 행만).
 * id 는 라우트 [techniqueId]에서 받고, 페이로드는 생성과 동일 스키마(techniqueInsertSchema)다.
 */
export async function updateTechnique(
  id: string,
  rawInput: TechniqueInsert,
  tagNames: string[] = [],
  mediaIds: string[] = [],
): Promise<TechniqueActionResult> {
  const parsed = techniqueInsertSchema.safeParse(rawInput);
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

  // db:types 생성(인프라) 후 실타입 — .from('techniques') 제네릭이 Update 컬럼을 안다.
  const { error } = await supabase
    .from('techniques')
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) {
    return { ok: false, error: error.message };
  }

  // 태그 재동기화(#6-1): 기존 기술 taggables 전체 삭제 후 현재 선택분 재삽입(작은 집합이라 단순·정확).
  // 폼이 편집 진입 시 기존 태그를 prefill하므로 빈 tagNames로 실수로 지워지지 않는다(fetchTechniqueTagNames).
  // RLS(taggables_owns)로 본인 소유 행만 삭제/삽입된다.
  const { error: delErr } = await supabase.from('taggables').delete().eq('technique_id', id);
  if (delErr) {
    return { ok: false, error: delErr.message };
  }
  const tagIds = await resolveTagIds(supabase, user.id, tagNames);
  if (tagIds.length > 0) {
    const { error: insErr } = await supabase
      .from('taggables')
      .insert(tagIds.map((tag_id) => ({ tag_id, technique_id: id })));
    if (insErr) return { ok: false, error: insErr.message };
  }

  // 미디어 재동기화(#6-4): 기존 media_links 전체 삭제 후 desired(유지된 기존 id + 새로 업로드된 id) 재삽입.
  // 자산(media_assets)은 지우지 않는다 — 링크만 재동기화(업로드 자산 재사용/고아 허용, resolveTagIds와 동일).
  // 폼이 기존 미디어를 prefill하므로 빈 배열로 실수로 끊기지 않는다(canSave 게이트).
  const { error: mediaDelErr } = await supabase.from('media_links').delete().eq('technique_id', id);
  if (mediaDelErr) {
    return { ok: false, error: mediaDelErr.message };
  }
  if (mediaIds.length > 0) {
    const { error: mediaInsErr } = await supabase
      .from('media_links')
      .insert(mediaIds.map((media_id) => ({ media_id, technique_id: id })));
    if (mediaInsErr) return { ok: false, error: mediaInsErr.message };
  }

  revalidatePath('/techniques');
  return { ok: true, techniqueId: id };
}
