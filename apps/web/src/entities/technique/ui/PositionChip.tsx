import type { PositionKind } from '@/shared/model/enums';
import { POSITION_LABEL } from '../lib/position-meta';

/**
 * 포지션 칩 (표시 전용 / PRD §4.4).
 *
 * CategoryChip 과 한 쌍으로 나란히 노출되는 경우가 많다(Design §7d "서브미션 · 백 컨트롤").
 * 색 과부하를 피하면서 둘을 시각적으로 구분하려고:
 *   - CategoryChip = **채움(filled)** 중립 칩(bg-[var(--surface-sunken)])
 *   - PositionChip = **외곽선(outline)** 중립 칩(border + 투명 배경 + muted 텍스트)
 * → 색 없이도 "분류 ↔ 포지션" 페어로 자연스럽게 읽힌다.
 *
 * 상호작용 없음 → 서버 컴포넌트. size-class 접근은 CategoryChip 과 동일.
 */
export interface PositionChipProps {
  position: PositionKind;
  size?: 'xs' | 'sm';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<PositionChipProps['size']>, string> = {
  xs: 'px-1.5 py-0.5',
  sm: 'px-2 py-1',
};

export function PositionChip({ position, size = 'sm', className = '' }: PositionChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-xxs border border-[var(--border-default)] bg-transparent text-button-xs text-[var(--text-muted)] ${SIZE_CLASS[size]} ${className}`}
    >
      {POSITION_LABEL[position]}
    </span>
  );
}
