import type { PositionKind } from '@/shared/model/enums';

/**
 * 포지션 한글 라벨 (PRD §4.4 — 표준 주짓수 포지션 용어).
 * category-meta.ts 의 CATEGORY_LABEL 구조를 그대로 미러링한 단순 Record.
 * SQL enum `position_kind` (POSITION_KINDS) 와 1:1 — 한쪽 변경 시 같은 PR에서 양쪽 동시 수정.
 */
export const POSITION_LABEL: Record<PositionKind, string> = {
  standing: '스탠딩',
  clinch: '클린치',
  closed_guard: '클로즈드 가드',
  open_guard: '오픈 가드',
  half_guard: '하프 가드',
  mount: '마운트',
  side_control: '사이드 컨트롤',
  back_control: '백 컨트롤',
  turtle: '터틀',
  north_south: '노스-사우스',
  knee_on_belly: '니 온 벨리',
  other: '기타',
};
