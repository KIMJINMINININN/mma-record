/**
 * widgets/shared-resource 공개 API (FSD).
 * 공유된 세션/기술 읽기 전용 카드 — F11 토큰 공유 + 체육관 공유 상세가 공유. 타입은 shared/model.
 */
export {
  SessionShareCard,
  TechniqueShareCard,
  SharedResourceCard,
} from './ui/SharedResourceCard';
export type {
  SharedResource,
  SharedSession,
  SharedTechniqueResource,
  SharedSessionTechnique,
  SharedMedia,
} from '@/shared/model/shared-resource';
