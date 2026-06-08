/**
 * features/share-session 공개 API (FSD).
 * 위젯(day-detail SessionCard)이 SessionShareButton 을, 기술 상세(TechniqueDetailView)가
 * TechniqueShareButton 을 가져온다. 둘 다 내부 제네릭 ShareButton 의 얇은 래퍼다.
 * 제네릭 ShareButton·서버 액션(share-actions)은 배럴로 재노출하지 않는다(클라/서버 그래프에 server-only
 * 누수 방지 — 래퍼/아일랜드가 직접 import. session-favorite 관용구와 동일).
 */
export { SessionShareButton } from './ui/SessionShareButton';
export { TechniqueShareButton } from './ui/TechniqueShareButton';
