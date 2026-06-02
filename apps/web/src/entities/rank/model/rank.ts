import { z } from 'zod';
import { RANK_TRACKS, BELTS, VISIBILITIES } from '@/shared/model/enums';
import { isoTimestamp } from '@/shared/lib/zod';

/**
 * user_ranks 테이블 1:1 (마이그레이션 0004 / PRD §4.3).
 * rank_track 단위 랭크 — bjj 1행이 gi·nogi를 공유(unique(user_id, track)).
 * 컬럼명은 DB 그대로 snake_case 유지(향후 db:types 생성물과 정합).
 */
export const userRankSchema = z.object({
  /** PK */
  id: z.string().uuid(),
  /** auth.users(id). 소유자 */
  user_id: z.string().uuid(),
  /** bjj | wrestling | striking | mma */
  track: z.enum(RANK_TRACKS),
  /** bjj 트랙만(gi·nogi 공유). 그 외 null */
  belt: z.enum(BELTS).nullable(),
  /** 0~4. 비bjj 트랙이면 보통 null */
  stripes: z.number().int().min(0).max(4).nullable(),
  /** 비bjj 트랙 '입문/중급/고급'(선택) */
  level: z.string().nullable(),
  /** 공개 범위. 기본 'private' */
  visibility: z.enum(VISIBILITIES),
  /** ISO timestamp */
  created_at: isoTimestamp,
  /** ISO timestamp */
  updated_at: isoTimestamp,
});

/** user_ranks 1행 */
export type UserRank = z.infer<typeof userRankSchema>;

/**
 * 신규/수정 입력용 — 서버가 채우는 컬럼(id/created_at/updated_at/user_id) 제외.
 * unique(user_id, track) 기준 upsert에 사용.
 */
export const userRankUpsertSchema = userRankSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
});

/** user_ranks upsert 입력 */
export type UserRankUpsert = z.infer<typeof userRankUpsertSchema>;
