import { cx } from 'class-variance-authority';

/**
 * Skeleton — 로딩 폴백용 회색 블록 (Design §4 / loading.tsx 공용).
 *
 * `animate-skeleton`(tailwind-utilities.css) shimmer를 위해 좌우 그라데이션 배경을 깐다.
 * 색은 surface-sunken↔raised 사이를 오가게 해 light/dark 모두 자연스럽게.
 * 표시 전용 → 서버 컴포넌트.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        'animate-skeleton rounded-xs bg-[length:200%_100%]',
        'bg-[linear-gradient(90deg,var(--surface-sunken)_25%,var(--surface-raised)_50%,var(--surface-sunken)_75%)]',
        className,
      )}
    />
  );
}
