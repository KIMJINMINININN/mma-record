'use server';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';

/** createShare 결과 — 클라이언트 아일랜드가 토스트 분기에 사용. */
export type CreateShareResult =
  | { ok: true; token: string }
  | { ok: false; dormant?: boolean; error: string };

const INFRA_DISABLED_MESSAGE =
  '공유 링크는 인프라 연결(NEXT_PUBLIC_AUTH_ENABLED) 후 활성화됩니다.';

/**
 * 공유 링크 생성/재사용 Server Action (F11 / 0022_shares.sql · 0024_share_technique.sql).
 *
 * 세션·기술 **둘 다** 서비스한다 — resource_type('session'|'technique') + resource_id 만 바뀌고
 * 본문 로직은 동일(shares 행은 polymorphic). 세션 카드 / 기술 상세의 공유 아일랜드가 함께 쓴다.
 *
 * logSession/toggleSessionFavorite 미러: isAuthEnabled() 게이트(도먼시 안내) → 서버 클라 →
 * auth.getUser()(없으면 로그인 필요). RLS(shares_owner_all: auth.uid()=owner_id) 하에서
 * 소유 행만 보이고 쓸 수 있다.
 *
 * **멱등(재사용)**: 같은 자원에 대해 공유는 1개면 충분하므로, 먼저 기존 share(owner_id=user.id,
 * resource_type, resource_id)를 조회해 있으면 그 token을 그대로 돌려준다(매번 새 링크를 찍지 않음).
 * 없으면 insert — owner_id/token/created_at은 DB default(auth.uid() / gen_random_uuid hex / now())가
 * 채우므로 resource_type/resource_id만 넘기고 `.select('token').single()`로 토큰을 회수한다.
 */
export async function createShare(
  resourceType: 'session' | 'technique',
  resourceId: string,
): Promise<CreateShareResult> {
  if (!isAuthEnabled()) {
    return { ok: false, dormant: true, error: INFRA_DISABLED_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  // 기존 공유 재사용 — 소유자 + 자원 키로 1건 조회(없으면 null). maybeSingle: 0행=정상(null).
  const { data: existing, error: selectError } = await supabase
    .from('shares')
    .select('token')
    .eq('owner_id', user.id)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .maybeSingle();
  if (selectError) return { ok: false, error: selectError.message };
  if (existing) return { ok: true, token: existing.token };

  // 신규 생성 — owner_id/token/created_at은 DB default가 채운다(resource_type/resource_id만 명시).
  const { data: created, error: insertError } = await supabase
    .from('shares')
    .insert({ resource_type: resourceType, resource_id: resourceId })
    .select('token')
    .single();
  if (insertError || !created) {
    return { ok: false, error: insertError?.message ?? '공유 링크 생성에 실패했습니다.' };
  }

  return { ok: true, token: created.token };
}
