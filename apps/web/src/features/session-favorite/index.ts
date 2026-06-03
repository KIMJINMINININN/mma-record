// 세션 즐겨찾기 feature 공개 API — 위젯(day-detail SessionCard)이 별표 아일랜드를 가져온다.
// 서버 액션(favorite-actions)은 배럴로 재노출하지 않는다(클라 번들 누수 방지 — 아일랜드가 직접 import).
export { SessionFavoriteStar, type SessionFavoriteStarProps } from './ui/SessionFavoriteStar';
