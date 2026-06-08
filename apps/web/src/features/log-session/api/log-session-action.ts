'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { resolveTagIds } from '@/entities/tag';
import { logSessionInputSchema, type LogSessionInput } from '../model/log-session-schema';

/** logSession 결과 — 클라이언트 폼이 토스트 분기에 사용. */
export type LogSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; dormant?: boolean; error: string };

const INFRA_DISABLED_MESSAGE =
  '세션 저장은 인프라 연결(NEXT_PUBLIC_AUTH_ENABLED) 후 활성화됩니다.';

/**
 * 세션 기록 Server Action (F3 / Develop §12, 0013_log_session.sql).
 * 도먼시: 플래그 OFF면 stale Supabase로 호출하지 않고 안내만 반환((auth)/actions.ts 패턴).
 */
export async function logSession(rawInput: LogSessionInput): Promise<LogSessionResult> {
  const parsed = logSessionInputSchema.safeParse(rawInput);
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

  // 태그 이름 → tag id(없으면 생성, #6-1). RPC의 p_tag_ids는 기존 태그 id 배열을 받는다.
  // (tags 생성은 RPC 트랜잭션 밖이지만 태그는 재사용 자원이라 고아 태그가 생겨도 무해.)
  const tagIds = await resolveTagIds(supabase, user.id, input.tag_names);

  // 생성된 log_session Args 는 optional 스칼라가 `string | undefined`(null 불가)이므로
  // 미입력은 `?? undefined` 로 넘긴다(스키마의 nullable 입력 → RPC 의 undefined 생략 인자).
  // 배열(disciplines/techniques/tag_ids/media)은 Args 의 Json 파라미터에 그대로 할당된다.
  const args = {
    p_user: user.id,
    p_trained_on: input.trained_on,
    p_gym: input.gym ?? undefined,
    p_class_type: input.class_type ?? undefined,
    p_duration_min: input.duration_min ?? undefined,
    p_intensity: input.intensity ?? undefined,
    p_rounds: input.rounds ?? undefined,
    p_partners: input.partners ?? undefined,
    p_memo_md: input.memo_md ?? undefined,
    p_rating: input.rating ?? undefined,
    p_disciplines: input.disciplines,
    p_techniques: input.techniques,
    p_tag_ids: tagIds,
    p_media: input.media,
  };

  // db:types 생성(인프라) 후 실타입 — rpc 제네릭이 'log_session'(Returns: string)을 안다.
  const { data, error } = await supabase.rpc('log_session', args);
  if (error || !data) {
    return { ok: false, error: error?.message ?? '세션 저장에 실패했습니다.' };
  }

  revalidatePath('/calendar');
  return { ok: true, sessionId: data };
}

/**
 * 세션 수정 Server Action (F3 편집, 0021_update_session.sql). logSession 미러 + p_session_id.
 * sessions 본체 UPDATE + 자식(종목/기술/태그/미디어) 재동기화 — is_favorite/생성시각 불변.
 * 도먼시: 플래그 OFF면 안내만. 태그는 이름→id 해석(resolveTagIds), 미디어는 이미 media_id.
 */
export async function updateSession(
  sessionId: string,
  rawInput: LogSessionInput,
): Promise<LogSessionResult> {
  const parsed = logSessionInputSchema.safeParse(rawInput);
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

  const tagIds = await resolveTagIds(supabase, user.id, input.tag_names);

  const args = {
    p_user: user.id,
    p_session_id: sessionId,
    p_trained_on: input.trained_on,
    p_gym: input.gym ?? undefined,
    p_class_type: input.class_type ?? undefined,
    p_duration_min: input.duration_min ?? undefined,
    p_intensity: input.intensity ?? undefined,
    p_rounds: input.rounds ?? undefined,
    p_partners: input.partners ?? undefined,
    p_memo_md: input.memo_md ?? undefined,
    p_rating: input.rating ?? undefined,
    p_disciplines: input.disciplines,
    p_techniques: input.techniques,
    p_tag_ids: tagIds,
    p_media: input.media,
  };

  // db:types 생성(인프라) 후 실타입 — rpc 제네릭이 'update_session'(Returns: string)을 안다(types.ts).
  const { data, error } = await supabase.rpc('update_session', args);
  if (error || !data) {
    return { ok: false, error: error?.message ?? '세션 수정에 실패했습니다.' };
  }

  revalidatePath('/calendar');
  return { ok: true, sessionId: data };
}
