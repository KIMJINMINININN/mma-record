import type { ReactNode } from 'react';
import { cva, cx, type VariantProps } from 'class-variance-authority';

/**
 * Callout — 강조 박스 (Design §9.3 / F6-AC2 ★).
 *
 * 좌측 4px 바 + soft 배경 + 헤더(아이콘 + 라벨)로 내용을 시각 강조하는 재사용 박스.
 * 기술 상세의 **주의점 / 디테일**(danger)이 대표 사용처 — "주의"라는 의미가 빨강 신호와 정합(P4).
 *
 * - danger: 좌측 빨강 바(`--primary`) + `--primary-soft` 배경 + 헤더 `--danger` 톤 + 기본 ⚠ 아이콘.
 *   `--primary-soft`는 light=red-50 / dark=red-900 틴트 → 다크 자동 대응, 본문은 `--text-default`(대비 유지).
 * - info: 중립 변형 — `--border-strong` 바 + `--surface-sunken` 배경 + `--text-default` 헤더.
 * - 색약 대응(§10.1 / F9): 색만으로 의미를 전달하지 않도록 **아이콘 + 라벨(title)을 항상 병기**.
 *   `title`은 필수 prop이며, 아이콘은 `aria-hidden`(라벨이 의미를 전달).
 *
 * 표시 전용(훅·상태 없음) → 서버 컴포넌트. 색·radius·border 모두 semantic 토큰만 참조(hex 금지).
 * FSD: shared/ui — react만 import. 상위 레이어 import 없음.
 */

const callout = cva('rounded-m overflow-hidden border-l-4 p-4', {
  variants: {
    variant: {
      danger: 'border-[var(--primary)] bg-[var(--primary-soft)]',
      info: 'border-[var(--border-strong)] bg-[var(--surface-sunken)]',
    },
  },
  defaultVariants: {
    variant: 'danger',
  },
});

const calloutHeader = cva('flex items-center gap-1.5 text-button-m font-medium', {
  variants: {
    variant: {
      danger: 'text-[var(--danger)]',
      info: 'text-[var(--text-default)]',
    },
  },
  defaultVariants: {
    variant: 'danger',
  },
});

/** variant별 기본 아이콘. danger=⚠. info는 아이콘 미지정 시 라벨만. */
const DEFAULT_ICON: Record<NonNullable<CalloutProps['variant']>, ReactNode> = {
  danger: '⚠',
  info: null,
};

export interface CalloutProps extends VariantProps<typeof callout> {
  /** 헤더 라벨 — 필수(색약 대응: 아이콘과 항상 병기). */
  title: string;
  /** 헤더 아이콘. 미지정 시 variant 기본 아이콘(danger=⚠). `aria-hidden`으로 렌더. */
  icon?: ReactNode;
  /** 본문. */
  children: ReactNode;
  /** 컨테이너에 병합할 추가 클래스. */
  className?: string;
}

/** 강조 박스. `variant`(danger 기본/info) · `title` 필수 · `icon`(미지정 시 기본). */
export function Callout({ variant, title, icon, children, className }: CalloutProps) {
  const resolvedVariant = variant ?? 'danger';
  const resolvedIcon = icon ?? DEFAULT_ICON[resolvedVariant];

  return (
    <div className={cx(callout({ variant }), className)}>
      <p className={calloutHeader({ variant })}>
        {resolvedIcon != null && <span aria-hidden="true">{resolvedIcon}</span>}
        {title}
      </p>
      <div className="mt-2 text-[var(--text-default)]">{children}</div>
    </div>
  );
}
