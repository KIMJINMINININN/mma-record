'use client';

import { cva, type VariantProps } from 'class-variance-authority';

import { resolveTagColor, tagColorCss } from '../lib/tag-meta';

/**
 * TagChip — 자유 태그 칩 (Design.md §6.3).
 * 이름 앞에 '#' 표시. radius rounded-xxs. 상호작용(클릭/제거)이 있어 클라이언트 컴포넌트.
 *
 * states: default / selected(필터 ON) / removable / disabled / focus-visible(빨강 ring).
 * 색약 대응(F9-AC4): 의미 색에는 항상 텍스트 라벨('#name')과 aria-label을 병기.
 *
 * semantic alias(--text-default/--text-muted/--danger/--ring-focus)는 :root 정의라
 * Tailwind 유틸 자동 생성이 안 되므로 arbitrary value로 사용한다.
 */

const chip = cva(
  // 공통: 인라인 플렉스 + 칩 형태 + 색/그림자 전환 + 빨강 focus-visible ring
  [
    'inline-flex items-center select-none align-middle',
    'rounded-xxs border whitespace-nowrap',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:shadow-[var(--ring-focus)]',
  ].join(' '),
  {
    variants: {
      size: {
        // sm: text-button-xs, xs: text-button-xxs
        sm: 'h-7 px-2.5 gap-1 text-button-xs',
        xs: 'h-6 px-2 gap-0.5 text-button-xxs',
      },
      selected: {
        // 필터 ON: semantic primary-soft 틴트(다크에서 red-900으로 flip) + primary 보더 + active 텍스트
        true: 'bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary-active)]',
        // default: 중립 surface 토큰, hover 시 text 색 8% 믹스로 한 단계 진하게
        false:
          'bg-[var(--surface-sunken)] border-transparent text-[var(--text-default)] hover:bg-[color-mix(in_srgb,var(--text-default)_8%,transparent)]',
      },
      disabled: {
        true: 'opacity-50 pointer-events-none',
        false: '',
      },
      clickable: {
        true: 'cursor-pointer',
        false: '',
      },
    },
    defaultVariants: {
      size: 'sm',
      selected: false,
      disabled: false,
      clickable: false,
    },
  },
);

type ChipVariants = VariantProps<typeof chip>;

export interface TagChipProps {
  /** 태그 이름 ('#' 접두사는 컴포넌트가 자동 표시) */
  label: string;
  /** 팔레트 키(tag-meta) 또는 null. 유효 키면 앞에 색 스와치 점 표시(색 단독 인코딩 아님 — '#name' 병기). */
  color?: string | null;
  size?: NonNullable<ChipVariants['size']>;
  /** 필터 선택 상태 */
  selected?: boolean;
  /** 우측 제거(×) 버튼 노출 */
  removable?: boolean;
  disabled?: boolean;
  /** 제거 버튼 클릭 콜백 */
  onRemove?: () => void;
  /** 칩 본문 클릭 콜백 (필터 토글 등) */
  onClick?: () => void;
  className?: string;
}

/** 제거(×) 아이콘 — currentColor 상속, 라이브러리 의존 없음. */
function CloseIcon({ size }: { size: NonNullable<ChipVariants['size']> }) {
  const px = size === 'xs' ? 8 : 9;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
    </svg>
  );
}

const removeButtonClass = [
  'inline-flex items-center justify-center shrink-0',
  'ml-0.5 rounded-full',
  'text-[var(--text-muted)] hover:text-[var(--danger)]',
  'transition-colors duration-150',
  'focus-visible:outline-none focus-visible:shadow-[var(--ring-focus)]',
  'disabled:pointer-events-none',
].join(' ');

export function TagChip({
  label,
  color = null,
  size = 'sm',
  selected = false,
  removable = false,
  disabled = false,
  onRemove,
  onClick,
  className,
}: TagChipProps) {
  const clickable = !!onClick && !disabled;

  // 색 스와치 점 — 유효 팔레트 키 + 비선택일 때만(selected 틴트/포커스 ring과 충돌 회피).
  // 색은 단독 식별 아님(F9): '#name' 텍스트 + aria-label의 색상 라벨이 식별을 보장하고 점은 aria-hidden.
  const colorMeta = resolveTagColor(color);
  const showColor = colorMeta !== null && !selected;
  const swatch = showColor ? (
    <span
      aria-hidden="true"
      className="inline-block size-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: tagColorCss(colorMeta) }}
    />
  ) : null;

  const ariaLabel = `태그 ${label}${showColor ? `, 색상 ${colorMeta.label}` : ''}${
    selected ? ', 선택됨' : ''
  }`;

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) onRemove?.();
  };

  const containerClassName = [
    chip({ size, selected, disabled, clickable }),
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // clickable + removable: 중첩 button을 피하기 위해 컨테이너를 span으로,
  // 토글 button과 제거 button을 형제(sibling)로 배치한다.
  if (clickable && removable) {
    return (
      <span
        className={containerClassName}
        aria-label={ariaLabel}
      >
        {/* 토글 button — 라벨/해시 텍스트만 포함 */}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={selected}
          aria-label={ariaLabel}
          className="inline-flex items-center gap-[inherit] focus-visible:outline-none focus-visible:shadow-[var(--ring-focus)]"
        >
          {swatch}
          <span aria-hidden="true" className="text-[var(--text-muted)]">
            #
          </span>
          <span className="min-w-0 truncate">{label}</span>
        </button>
        {/* 제거 button — 토글 button의 형제(sibling), 중첩 없음 */}
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          aria-label={`태그 ${label} 제거`}
          className={removeButtonClass}
        >
          <CloseIcon size={size} />
        </button>
      </span>
    );
  }

  // clickable만 (removable 없음): 기존 방식 — button 루트.
  if (clickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={ariaLabel}
        className={containerClassName}
      >
        {swatch}
        <span aria-hidden="true" className="text-[var(--text-muted)]">
          #
        </span>
        <span className="min-w-0 truncate">{label}</span>
      </button>
    );
  }

  // 비클릭: 의미 정보 전달용 span (제거 버튼은 자체 button으로 동작).
  return (
    <span
      className={containerClassName}
      aria-label={ariaLabel}
    >
      {swatch}
      <span aria-hidden="true" className="text-[var(--text-muted)]">
        #
      </span>
      <span className="min-w-0 truncate">{label}</span>
      {removable && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          aria-label={`태그 ${label} 제거`}
          className={removeButtonClass}
        >
          <CloseIcon size={size} />
        </button>
      )}
    </span>
  );
}
