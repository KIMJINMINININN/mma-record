import { z } from 'zod';
import { isoTimestamp } from '@/shared/lib/zod';

/**
 * 체육관/팀 스페이스 (Phase ①) — 도메인 타입.
 * RPC(get_my_gym / get_gym_by_invite_code)가 jsonb를 반환하므로 zod로 파싱·검증한다.
 * SSoT: 마이그레이션 0027_gyms.sql / docs/issue/20260610/gym-team-spaces-plan.md
 */

export const GYM_ROLES = ['owner', 'coach', 'member'] as const;
export type GymRole = (typeof GYM_ROLES)[number];

export const GYM_NAME_MAX = 60;

/** 체육관 이름 입력 검증(테이블 check 1..60과 대칭). */
export const gymNameSchema = z
  .string()
  .trim()
  .min(1, '체육관 이름을 입력해 주세요')
  .max(GYM_NAME_MAX, `이름은 ${GYM_NAME_MAX}자 이하여야 해요`);

export const gymMemberSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string(),
  role: z.enum(GYM_ROLES),
  joined_at: isoTimestamp,
  is_me: z.boolean(),
});
export type GymMember = z.infer<typeof gymMemberSchema>;

/** get_my_gym 반환(미소속이면 null). invite_code는 관장에게만 채워진다. */
export const myGymSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  owner_id: z.string().uuid(),
  is_owner: z.boolean(),
  invite_code: z.string().nullable(),
  created_at: isoTimestamp,
  members: z.array(gymMemberSchema),
});
export type MyGym = z.infer<typeof myGymSchema>;

/** get_gym_by_invite_code 반환(무효 코드면 null) — 가입 전 미리보기. */
export const gymPreviewSchema = z.object({
  name: z.string(),
  member_count: z.number(),
});
export type GymPreview = z.infer<typeof gymPreviewSchema>;
