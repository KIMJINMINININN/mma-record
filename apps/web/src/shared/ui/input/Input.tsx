import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cx } from 'class-variance-authority';

/**
 * Input — 라벨 포함 기본 텍스트 입력 원자 (Design §2.7 / Develop §6.5).
 *
 * - 접근성: `<label htmlFor>` ↔ input id 연결(미지정 시 `useId`로 자동 생성).
 * - 토큰 기반: 색·테두리·포커스 모두 semantic 토큰만 참조 → 다크 자동 대응.
 * - 포커스: Button과 동일하게 `--ring-focus`(빨강 3px) `focus-visible` 링(A11y §10.1).
 * - 상태/훅 최소(useId만) → 클라이언트 경계는 호출부(폼)가 결정.
 *
 * 인증 폼(login/signup) 및 향후 폼 입력에 공통 사용.
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 라벨 텍스트(필수 — 접근성). */
  label: string;
  /** 라벨/입력을 감싸는 래퍼 클래스. */
  wrapperClassName?: string;
}

/** 라벨 포함 텍스트 입력. `label` 필수. native input props 전달. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, id, wrapperClassName, className, ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;

  return (
    <div className={cx('flex flex-col gap-1.5', wrapperClassName)}>
      <label
        htmlFor={inputId}
        className="text-body-s-500 text-[var(--text-default)]"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={cx(
          'h-10 w-full rounded-xs px-3',
          'bg-[var(--surface-base)] text-body-m-400 text-[var(--text-strong)]',
          'border border-[var(--border-strong)]',
          'placeholder:text-[var(--text-disabled)]',
          'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
          'outline-none focus-visible:shadow-[var(--ring-focus)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...rest}
      />
    </div>
  );
});
