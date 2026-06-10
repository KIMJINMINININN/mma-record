import { z } from 'zod';
import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import type { SharedResourceEnvelope } from '@/shared/model/shared-resource';
import {
  gymFeedItemSchema,
  type GymFeedItem,
  type GymShareResourceType,
} from '../model/gym-share';

/**
 * 체육관 공유 읽기 쿼리 (entities/gym-share). 전부 security-definer RPC 경유(0029).
 */

export const GYM_FEED_KEY = ['gym', 'feed'] as const;
/** 타입별 "내가 공유한 resource_id" 집합 키(토글 상태). invalidate는 접두 ['gym']. */
export const gymSharesKey = (t: GymShareResourceType) => ['gym', 'shares', t] as const;

/** 체육관 피드(관장=전체 / 관원=본인). 최신순. */
export async function getGymFeed(): Promise<GymFeedItem[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('get_gym_feed');
  if (error) throw error;
  return z.array(gymFeedItemSchema).parse(data ?? []);
}

/** 내가 체육관에 공유한 resource_id 목록(해당 타입) — 토글 상태용. */
export async function listMyGymShares(resourceType: GymShareResourceType): Promise<string[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('list_my_gym_shares', {
    p_resource_type: resourceType,
  });
  if (error) throw error;
  return z.array(z.string()).parse(data ?? []);
}

/** 공유 상세 쿼리 키(2b). */
export const gymSharedDetailKey = (gymShareId: string) =>
  ['gym', 'share-detail', gymShareId] as const;

/** 공유된 세션/기술 풀 상세(get_gym_shared_detail) — 봉투 {type,data}. 없으면 null, 원본 삭제 시 data=null.
 *  형태가 토큰 공유와 동일해 widgets/shared-resource 카드를 재사용한다(F11 share-view와 같은 캐스팅 방식). */
export async function getGymSharedDetail(gymShareId: string): Promise<SharedResourceEnvelope | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('get_gym_shared_detail', {
    p_gym_share_id: gymShareId,
  });
  if (error) throw error;
  return (data as SharedResourceEnvelope | null) ?? null;
}
