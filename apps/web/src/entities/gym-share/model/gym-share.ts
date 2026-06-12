import { z } from 'zod';
import { isoTimestamp } from '@/shared/lib/zod';

/**
 * 체육관 공유 (Phase ②) — 도메인 타입.
 * RPC(get_gym_feed / list_my_gym_shares)가 jsonb를 반환하므로 zod로 파싱·검증한다.
 * SSoT: 마이그레이션 0029_gym_shares.sql / docs/issue/20260610/gym-phase2-plan.md
 */

export const GYM_SHARE_RESOURCE_TYPES = ['session', 'technique'] as const;
export type GymShareResourceType = (typeof GYM_SHARE_RESOURCE_TYPES)[number];

/** get_gym_feed 항목 — 요약(2a). 상세/코멘트는 2b/2c. */
export const gymFeedItemSchema = z.object({
  id: z.string().uuid(),
  resource_type: z.enum(GYM_SHARE_RESOURCE_TYPES),
  resource_id: z.string().uuid(),
  member_name: z.string(),
  is_mine: z.boolean(),
  shared_at: isoTimestamp,
  title: z.string(),
  subtitle: z.string().nullable(),
  /** 공유 범위(0038) — coaches/everyone/owner/specific. 라벨 매핑은 entities/gym. 구 페이로드 대비 nullish. */
  visibility: z.string().nullish(),
  /** 원본(세션/기술)이 삭제됨 → 상세 불가, 목록엔 표시. */
  missing: z.boolean(),
});
export type GymFeedItem = z.infer<typeof gymFeedItemSchema>;
