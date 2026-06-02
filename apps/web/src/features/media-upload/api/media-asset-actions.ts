'use server';

import { z } from 'zod';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { mediaAssetInsertSchema, type MediaAssetInsert } from '@/entities/media';

/**
 * 미디어 자산 생성 Server Action (F5 / #6-3, 0008_media_assets.sql).
 *
 * youtube=videoId, upload=업로드 완료된 storage_path+메타를 받아 media_assets 행을 만들고 id를 돌려준다.
 * 실제 파일 업로드(sign-upload→PUT)는 클라이언트(persist-media)가 먼저 끝낸 뒤 이 액션을 호출한다 —
 * 여기서는 메타데이터 행만 만든다. user_id는 getUser()로 서버가 채운다(RLS media_assets_owns_rows).
 *
 * 도먼시: 플래그 OFF면 Supabase 무접촉 안내((auth)/actions.ts·log-session-action.ts 패턴).
 */

export type CreateMediaAssetsResult =
  | { ok: true; ids: string[] }
  | { ok: false; dormant?: boolean; error: string };

const DISABLED_MESSAGE = '미디어 저장은 인프라 연결(NEXT_PUBLIC_AUTH_ENABLED) 후 활성화됩니다.';

/**
 * media_assets 행 N개 생성 → id 배열 반환(세션/기술 연결용).
 * inputs는 mediaAssetInsertSchema(discriminated union)로 검증 — kind별 필수 컬럼(DB check)과 정합.
 */
export async function createMediaAssets(
  inputs: MediaAssetInsert[],
): Promise<CreateMediaAssetsResult> {
  if (inputs.length === 0) return { ok: true, ids: [] };

  const parsed = z.array(mediaAssetInsertSchema).safeParse(inputs);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '미디어 입력값을 확인하세요.' };
  }

  if (!isAuthEnabled()) {
    return { ok: false, dormant: true, error: DISABLED_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  // user_id는 서버가 강제(RLS with check). visibility 미지정 시 DB default 'private'.
  const rows = parsed.data.map((m) => ({ ...m, user_id: user.id }));
  const { data, error } = await supabase.from('media_assets').insert(rows).select('id');
  if (error || !data) {
    return { ok: false, error: error?.message ?? '미디어 저장에 실패했습니다.' };
  }

  return { ok: true, ids: data.map((r) => r.id) };
}
