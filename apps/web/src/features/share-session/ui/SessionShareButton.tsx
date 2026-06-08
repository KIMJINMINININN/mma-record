import { ShareButton } from './ShareButton';

/**
 * SessionShareButton — 세션 카드의 '공유' 진입점 (F11 / 0022_shares.sql).
 * 제네릭 ShareButton 에 resourceType='session' 을 고정한 얇은 래퍼(SessionCard가 import).
 */
export function SessionShareButton({ sessionId }: { sessionId: string }) {
  return <ShareButton resourceType="session" resourceId={sessionId} ariaLabel="세션 공유 링크 복사" />;
}
