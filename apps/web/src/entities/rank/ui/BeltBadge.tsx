import type { CSSProperties } from 'react';
import type { Belt } from '@/shared/model/enums';
import { BELT_META, stripeColorFor, beltFullLabel } from '../lib/belt-meta';

/**
 * BeltBadge — 주짓수 벨트 배지 (Design §6.1 / §2.5 / F9-AC1).
 * 벨트 색 바(bar) + stripe(0~4 세로 막대) + 라벨(색약 대응 항상 병기).
 * 표시 전용(상호작용 없음) → 서버 컴포넌트.
 */
export interface BeltBadgeProps {
  belt: Belt;
  /** 0~4. 기본 0 */
  stripes?: number;
  /** xs(인라인 14) | sm(카드 18) | md(상세 헤더 24). 기본 sm */
  size?: 'xs' | 'sm' | 'md';
  /** 라벨 병기 여부. 기본 true */
  showLabel?: boolean;
  className?: string;
}

/** 사이즈별 바 높이(px) / 바 너비(px) / stripe 막대 너비(px) */
const SIZE = {
  xs: { barH: 14, barW: 30, stripeW: 1.5, gap: 2, pad: 3 },
  sm: { barH: 18, barW: 40, stripeW: 2, gap: 2.5, pad: 4 },
  md: { barH: 24, barW: 54, stripeW: 2.5, gap: 3, pad: 5 },
} as const;

/** 라벨 타이포 유틸 — xs 는 더 작게 */
const LABEL_UTIL = {
  xs: 'text-button-xxs',
  sm: 'text-button-xs',
  md: 'text-button-xs',
} as const;

export function BeltBadge({
  belt,
  stripes = 0,
  size = 'sm',
  showLabel = true,
  className,
}: BeltBadgeProps) {
  const meta = BELT_META[belt];
  const dims = SIZE[size];
  const n = Math.max(0, Math.min(4, Math.trunc(stripes)));
  const stripeColor = stripeColorFor(belt);
  const isWhite = belt === 'white';

  // light/dark 바 색을 CSS 변수로 주입 → dark: arbitrary-property 로 스왑.
  // meta.bar/barDark 는 belt-meta 에서 `var(--color-belt-*)` 토큰을 담고 있어
  // 여기서 한 단계 더 감싼 --belt-bar(-dark) 로 노출 → 아래 bg 유틸이 해석한다.
  const barStyle: CSSProperties = {
    '--belt-bar': meta.bar,
    '--belt-bar-dark': meta.barDark,
    width: dims.barW,
    height: dims.barH,
    paddingRight: dims.pad,
    columnGap: dims.gap,
  } as CSSProperties;

  const label = beltFullLabel(belt, n);
  const ariaLabel = `${meta.label} 벨트${n > 0 ? `, 스트라이프 ${n}` : ''}`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className ?? ''}`}
      role="img"
      aria-label={ariaLabel}
    >
      <span
        // 바: 기본 라이트 색, dark 에서는 barDark 로 스왑.
        // 흰띠: inset ring(gray-300) + 미세 그림자(shadow-e1), dark 에서는 border gray-600.
        className={[
          'relative inline-flex shrink-0 items-center justify-end overflow-hidden rounded-xxs',
          'bg-[var(--belt-bar)] dark:bg-[var(--belt-bar-dark)]',
          isWhite
            ? 'shadow-e1 ring-1 ring-inset ring-gray-300 dark:ring-0 dark:border dark:border-gray-600'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={barStyle}
        aria-hidden="true"
      >
        {/* stripe 영역: N개 세로 막대. 0 이면 비움. */}
        {n > 0 && (
          <span
            className="flex h-full items-center"
            style={{ columnGap: dims.gap }}
          >
            {Array.from({ length: n }).map((_, i) => (
              <span
                key={i}
                className="rounded-[1px]"
                style={{
                  width: dims.stripeW,
                  // 바 높이보다 살짝 안쪽으로(위아래 여백) → 또렷한 막대.
                  height: dims.barH - dims.pad * 2,
                  backgroundColor: stripeColor,
                }}
              />
            ))}
          </span>
        )}
      </span>

      {showLabel && (
        <span
          className={`${LABEL_UTIL[size]} whitespace-nowrap text-[var(--text-muted)]`}
        >
          {label}
        </span>
      )}
    </span>
  );
}
