import { ShareButton } from './ShareButton';

/**
 * TechniqueShareButton — 기술 상세의 '공유' 진입점 (F11 / 0024_share_technique.sql).
 * 제네릭 ShareButton 에 resourceType='technique' 를 고정한 얇은 래퍼(TechniqueDetailView가 import).
 */
export function TechniqueShareButton({ techniqueId }: { techniqueId: string }) {
  return (
    <ShareButton resourceType="technique" resourceId={techniqueId} ariaLabel="기술 공유 링크 복사" />
  );
}
