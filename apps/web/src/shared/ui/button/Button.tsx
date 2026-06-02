import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cva, cx, type VariantProps } from 'class-variance-authority';

/**
 * Button — 디자인시스템 기본 버튼 (Design §2.7 / Develop §6.5).
 *
 * 빨강(`--primary`) = 항상 액션 신호. primary는 풀폭 CTA·확정 액션에,
 * secondary는 보조 액션(테두리), ghost는 저강도 액션(아이콘 옆 텍스트 등)에 사용.
 *
 * - 토큰 기반: 색은 semantic 토큰(`--primary*`/`--surface*`/`--text*`)만 참조 → 다크 자동 대응.
 * - 포커스: `--ring-focus`(빨강 3px)로 `focus-visible` 링(A11y §10.1).
 * - hover는 `pointer-hover`(pointer:fine)에만 적용 → 터치 기기 false-hover 방지(§10.3).
 * - 상호작용 요소지만 상태/훅 없음 → 서버에서도 렌더 가능(클라이언트 경계는 호출부가 결정).
 */

const button = cva(
  [
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap',
    'rounded-xs font-medium select-none',
    'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
    'outline-none focus-visible:shadow-[var(--ring-focus)]',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-[var(--primary)] text-[var(--text-on-primary)]',
          'pointer-hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]',
        ],
        secondary: [
          'bg-[var(--surface-base)] text-[var(--text-default)]',
          'border border-[var(--border-strong)]',
          'pointer-hover:bg-[var(--surface-sunken)]',
        ],
        ghost: [
          'bg-transparent text-[var(--text-default)]',
          'pointer-hover:bg-[var(--surface-sunken)]',
        ],
      },
      size: {
        sm: 'h-8 px-2.5 text-button-s rounded-xxs',
        md: 'h-10 px-3.5 text-button-m',
        lg: 'h-12 px-5 text-button-l',
      },
      block: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      block: false,
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

/** 기본 버튼. variant(primary/secondary/ghost) · size(sm/md/lg) · block(풀폭). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cx(button({ variant, size, block }), className)}
      {...rest}
    />
  );
});
