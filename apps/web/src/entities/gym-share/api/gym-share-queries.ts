import { z } from 'zod';
import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
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
