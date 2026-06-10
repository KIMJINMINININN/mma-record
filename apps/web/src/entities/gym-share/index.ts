/**
 * entities/gym-share 공개 API (FSD).
 * 체육관 공유(관원→체육관) 도메인 타입 + 읽기 쿼리.
 */
export {
  GYM_SHARE_RESOURCE_TYPES,
  gymFeedItemSchema,
  type GymShareResourceType,
  type GymFeedItem,
} from './model/gym-share';
export { getGymFeed, listMyGymShares, GYM_FEED_KEY, gymSharesKey } from './api/gym-share-queries';
