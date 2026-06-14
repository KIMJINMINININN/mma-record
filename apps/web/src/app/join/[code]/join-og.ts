import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

import { gymPreviewSchema, type GymPreview } from '@/entities/gym';
import type { Database } from '@/shared/api/supabase/types';

/**
 * join-og — `/join/[code]` OG 미리보기용 서버 페치 + 메타 빌더 (초대 퍼널 ② 후속).
 *
 * 카카오톡/메신저 크롤러는 JS 미실행 → generateMetadata가 **서버에서** 체육관명을 읽어야 채팅에
 * "○○ 체육관 초대"가 뜬다(퍼널 강화). 본문/가입은 기존대로 클라 아일랜드(JoinView). 여기선 메타
 * 전용 **쿠키 없는 순수 anon 클라이언트**(get_gym_by_invite_code는 anon grant — 0028).
 *
 * 노출 수위: 초대 링크를 아는 사람이 보는 미리보기와 동일(체육관명·인원수) — 코드 소지 = 초대 대상.
 * 무효/만료/회전된 코드는 일반 문구로 응답해 존재 여부를 누설하지 않는다(/share OG 정책과 동일).
 */

/** 초대코드 → 체육관 미리보기(무효면 null). React cache로 같은 렌더 패스 내 중복 호출 dedupe. */
export const fetchGymPreviewForOg = cache(async (code: string): Promise<GymPreview | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null; // 인프라 전(도먼시) — 일반 메타로 폴백

  try {
    const anon = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.rpc('get_gym_by_invite_code', { p_invite_code: code });
    if (error || data == null) return null;
    return gymPreviewSchema.parse(data);
  } catch {
    return null;
  }
});

export interface JoinOgText {
  title: string;
  description: string;
}

/** 무효/만료 코드용 일반 문구 — 존재 누설 없음. */
export const GENERIC_JOIN_OG: JoinOgText = {
  title: '체육관 초대 · MatLog',
  description: 'MatLog 체육관 초대 링크입니다.',
};

/** 미리보기 → OG 제목/설명 (순수 함수). 유효 코드면 체육관명+인원, 아니면 일반 문구. */
export function buildJoinOgText(preview: GymPreview | null): JoinOgText {
  if (!preview) return GENERIC_JOIN_OG;
  return {
    title: `${preview.name} 체육관 초대 · MatLog`,
    description: `멤버 ${preview.member_count}명 · 링크로 가입을 요청하고 함께 훈련 기록을 공유해요.`,
  };
}
