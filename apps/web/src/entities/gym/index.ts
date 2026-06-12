/**
 * entities/gym 공개 API (FSD).
 * 체육관/팀 스페이스 도메인 타입 + 읽기 쿼리.
 */
export {
  GYM_ROLES,
  GYM_SHARE_VISIBILITIES,
  GYM_SHARE_VISIBILITY_LABEL,
  GYM_NAME_MAX,
  gymNameSchema,
  gymMemberSchema,
  myGymSchema,
  gymPreviewSchema,
  pendingRequestSchema,
  joinRequestSchema,
  type GymRole,
  type GymShareVisibility,
  type GymMember,
  type MyGym,
  type GymPreview,
  type PendingRequest,
  type JoinRequest,
} from './model/gym';
export {
  fetchMyGym,
  fetchGymByInviteCode,
  getMyPendingRequest,
  listGymJoinRequests,
  GYM_QUERY_KEY,
  PENDING_REQUEST_KEY,
  JOIN_REQUESTS_KEY,
} from './api/gym-queries';
