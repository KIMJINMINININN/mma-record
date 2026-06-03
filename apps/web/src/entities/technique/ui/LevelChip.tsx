import type { CSSProperties } from 'react';

import type { Level } from '@/shared/model/enums';

import { LEVEL_META } from '../lib/level-meta';

/**
 * LevelChip — 비벨트 종목 기술 레벨 배지 (F4 P1 / PRD §3, Design §6·§7d).
 *
 * 주짓수의 BeltBadge 와 같은 슬롯(카드/상세 배지 행 1)에 들어가는 **상호배타** 배지:
 * 벨트 종목은 BeltBadge, 비벨트(레슬링·타격·MMA)는 LevelChip. 채움 칩 + 한글 라벨(입문/중급/고급).
 *
 * 색은 LEVEL_META 의 light/dark 값을 CSS 변수로 주입하고 `dark:` 변형으로 스왑한다
 * (BeltBadge 의 --belt-bar 주입과 동일 관용구). 라벨은 항상 병기 → 색약/대비 안전(F9).
 * 표시 전용(상호작용 없음) → 서버 컴포넌트. size 접근은 PositionChip 과 동일.
 */
export interface LevelChipProps {
  level: Level;
  size?: 'xs' | 'sm';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<LevelChipProps['size']>, string> = {
  xs: 'px-1.5 py-0.5',
  sm: 'px-2 py-1',
};

export function LevelChip({ level, size = 'sm', className = '' }: LevelChipProps) {
  const meta = LEVEL_META[level];
  const style: CSSProperties = {
    '--level-bg': meta.bg,
    '--level-bg-dark': meta.bgDark,
    '--level-fg': meta.fg,
    '--level-fg-dark': meta.fgDark,
  } as CSSProperties;

  return (
    <span
      className={[
        'inline-flex items-center rounded-xxs text-button-xs font-medium',
        'bg-[var(--level-bg)] text-[var(--level-fg)]',
        'dark:bg-[var(--level-bg-dark)] dark:text-[var(--level-fg-dark)]',
        SIZE_CLASS[size],
        className,
      ].join(' ')}
      style={style}
      // 라벨만으로는 "고급"이 무엇의 등급인지 모호 → SR 에 "레벨" 맥락 부여(시각 라벨은 간결 유지).
      aria-label={`레벨 ${meta.label}`}
    >
      {meta.label}
    </span>
  );
}
