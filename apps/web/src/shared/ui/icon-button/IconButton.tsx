import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cva, cx, type VariantProps } from 'class-variance-authority';

/**
 * IconButton — 아이콘 전용 정사각 버튼 (Design §10.1).
 *
 * 텍스트 라벨이 없으므로 `aria-label`을 **필수**로 받는다(스크린리더 접근성).
 * 색/포커스는 Button과 동일한 semantic 토큰·`--ring-focus` 규칙을 따른다.
 *
 * 터치 타깃(WCAG 2.5.5, 44×44): 시각 크기(size-8/10)는 그대로 두고, 44 미만인 sm·md 에는
 * 중앙 정렬 **투명 pseudo**(`before:size-11`)로 hit-area 만 44×44 로 키운다(`HIT_AREA_44`).
 * 시각·레이아웃 불변 + 누르는 영역만 확대. 부모가 pseudo 를 자르지 않도록 `overflow-hidden`
 * 컨테이너에 넣지 말 것(현 사용처: 캘린더 네비·테마토글·별표 모두 비-clip 컨테이너). lg(=44)는 이미 충족 → 미적용.
 */

/**
 * 중앙 정렬 투명 pseudo(44×44) — hit-area 만 키우는 핵심 조각(시각 불변, WCAG 2.5.5).
 * `position: relative|absolute` 컨텍스트가 **이미 있는** 요소(예: 절대배치 오버레이)에 쓴다.
 */
export const HIT_AREA_44_BEFORE =
  'before:absolute before:left-1/2 before:top-1/2 before:size-11 ' +
  "before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']";

/**
 * 중앙 정렬 투명 hit-area(44×44) — 시각 크기 < 44 인 아이콘/작은 버튼 공용 관용구(WCAG 2.5.5).
 * `relative` 를 함께 건다 → static 요소 전용. 이미 `absolute`/`relative` 인 요소엔 위 `_BEFORE` 만 사용
 * (position 유틸 충돌 회피).
 */
export const HIT_AREA_44 = `relative ${HIT_AREA_44_BEFORE}`;

/**
 * 세로 hit-area 보강(44px 높이) — **텍스트 버튼**용(가로 px 로 폭은 이미 ≥44, 높이만 부족).
 * 시각 높이는 유지하고 버튼 폭 전체에 투명 pseudo(inset-x-0)를 깔아 세로만 키운다(정사각 대비 좁은 버튼도 안전).
 * `relative` 포함 → static 요소 전용. (예: Button sm/md, "오늘로"·"수정" styled Link.)
 */
export const HIT_AREA_44_Y =
  'relative before:absolute before:inset-x-0 before:top-1/2 before:h-11 ' +
  "before:-translate-y-1/2 before:content-['']";

const iconButton = cva(
  [
    'inline-flex items-center justify-center shrink-0',
    'rounded-xs text-[var(--text-default)]',
    'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
    'outline-none focus-visible:shadow-[var(--ring-focus)]',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        ghost: 'bg-transparent pointer-hover:bg-[var(--surface-sunken)]',
        solid:
          'bg-[var(--surface-raised)] border border-[var(--border-default)] pointer-hover:bg-[var(--surface-sunken)]',
      },
      size: {
        // sm·md 는 44 미만 → HIT_AREA_44 로 hit-area 보강(시각 32/40 유지). lg=44 는 이미 충족.
        sm: `size-8 rounded-xxs ${HIT_AREA_44}`,
        md: `size-10 ${HIT_AREA_44}`,
        lg: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'md',
    },
  },
);

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButton> {
  /** 스크린리더용 라벨 — 아이콘만 있으므로 필수. */
  'aria-label': string;
}

/** 아이콘 전용 버튼. `aria-label` 필수. variant(ghost/solid) · size(sm/md/lg). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant, size, className, type, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cx(iconButton({ variant, size }), className)}
      {...rest}
    >
      {children}
    </button>
  );
});
