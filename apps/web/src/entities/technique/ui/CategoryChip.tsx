import type { TechniqueCategory } from '@/shared/model/enums';
import { CATEGORY_LABEL } from '../lib/category-meta';

/**
 * 기술 분류 칩 (표시 전용 / PRD §4.2).
 * category는 종류가 많아 색 과부하 방지를 위해 중립 스타일을 사용한다.
 * 상호작용 없음 → 서버 컴포넌트.
 */
export interface CategoryChipProps {
  category: TechniqueCategory;
  size?: 'xs' | 'sm';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<CategoryChipProps['size']>, string> = {
  xs: 'px-1.5 py-0.5',
  sm: 'px-2 py-1',
};

export function CategoryChip({ category, size = 'sm', className = '' }: CategoryChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-xxs text-button-xs bg-[var(--surface-sunken)] text-[var(--text-default)] ${SIZE_CLASS[size]} ${className}`}
    >
      {CATEGORY_LABEL[category]}
    </span>
  );
}
