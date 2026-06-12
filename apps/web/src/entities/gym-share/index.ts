/**
 * entities/gym-share 공개 API (FSD).
 * 체육관 공유(관원→체육관) 도메인 타입 + 읽기 쿼리.
 */
export {
  GYM_SHARE_RESOURCE_TYPES,
  gymFeedItemSchema,
  myGymShareSchema,
  type GymShareResourceType,
  type GymFeedItem,
  type MyGymShare,
} from './model/gym-share';
export {
  getGymFeed,
  listMyGymShares,
  getGymSharedDetail,
  GYM_FEED_KEY,
  gymSharesKey,
  gymSharedDetailKey,
} from './api/gym-share-queries';
