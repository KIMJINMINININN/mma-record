import { IconButton } from '../icon-button/IconButton';
import { StarFilledIcon, StarIcon } from '../icons/icons';

/**
 * FavoriteStar — 즐겨찾기 토글 버튼(표시 전용 프리젠테이셔널, F4 P1 즐겨찾기 / PRD §9).
 *
 * 토글 상태(isFavorite)와 onToggle 콜백만 받는 순수 버튼 — 실제 mutation/optimistic 은
 * 호출하는 클라이언트 아일랜드(TechniqueFavoriteStar / SessionFavoriteStar)가 소유한다.
 * 그래서 이 컴포넌트 자체는 'use client' 가 아니다(핸들러를 props 로만 받음, shared/ui 거주).
 *
 * a11y: 토글 버튼 관용구 — 정적 라벨 "즐겨찾기" + `aria-pressed`로 on/off 전달(WAI-ARIA).
 * 채운 별은 브랜드 `--primary`(팔레트 reset — 정의된 토큰), 빈 별은 muted. 색은 보조이고
 * aria-pressed 가 상태를 보장(F9 — 색 단독 인코딩 아님).
 */
export interface FavoriteStarProps {
  isFavorite: boolean;
  onToggle: () => void;
  /** 진행 중(서버 액션 대기) — 버튼 비활성으로 연타 방지. */
  pending?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function FavoriteStar({
  isFavorite,
  onToggle,
  pending = false,
  size = 'sm',
  className = '',
}: FavoriteStarProps) {
  return (
    <IconButton
      aria-label="즐겨찾기"
      aria-pressed={isFavorite}
      variant="ghost"
      size={size}
      disabled={pending}
      onClick={onToggle}
      className={[
        isFavorite ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]',
        className,
      ].join(' ')}
    >
      {isFavorite ? (
        <StarFilledIcon width={18} height={18} />
      ) : (
        <StarIcon width={18} height={18} />
      )}
    </IconButton>
  );
}
