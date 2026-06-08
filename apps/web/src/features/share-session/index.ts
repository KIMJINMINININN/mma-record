/**
 * features/share-session 공개 API (FSD).
 * 위젯(day-detail SessionCard)이 공유 버튼 아일랜드를 가져온다.
 * 서버 액션(share-actions)은 배럴로 재노출하지 않는다(클라/서버 그래프에 server-only 누수 방지 —
 * 아일랜드가 직접 import. session-favorite 관용구와 동일).
 */
export { SessionShareButton } from './ui/SessionShareButton';
