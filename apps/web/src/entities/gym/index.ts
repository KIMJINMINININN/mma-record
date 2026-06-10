/**
 * entities/gym 공개 API (FSD).
 * 체육관/팀 스페이스 도메인 타입 + 읽기 쿼리.
 */
export {
  GYM_ROLES,
  GYM_NAME_MAX,
  gymNameSchema,
  gymMemberSchema,
  myGymSchema,
  gymPreviewSchema,
  type GymRole,
  type GymMember,
  type MyGym,
  type GymPreview,
} from './model/gym';
export { fetchMyGym, fetchGymByInviteCode, GYM_QUERY_KEY } from './api/gym-queries';
