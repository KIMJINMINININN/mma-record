import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cva, cx, type VariantProps } from 'class-variance-authority';

/**
 * IconButton — 아이콘 전용 정사각 버튼 (Design §10.1).
 *
 * 텍스트 라벨이 없으므로 `aria-label`을 **필수**로 받는다(스크린리더 접근성).
 * hit-area는 최소 44×44 권장(§10.1 터치 타깃) — md 기본 40, lg 44.
 * 색/포커스는 Button과 동일한 semantic 토큰·`--ring-focus` 규칙을 따른다.
 */

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
        sm: 'size-8 rounded-xxs',
        md: 'size-10',
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
