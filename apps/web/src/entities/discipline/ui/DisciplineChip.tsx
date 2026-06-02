import type { CSSProperties } from 'react';

import { DISCIPLINE_META } from '@/entities/discipline/lib/discipline-meta';
import type { Discipline } from '@/shared/model/enums';

import { DisciplineIcon } from './DisciplineIcon';

/**
 * DisciplineChip — 종목 칩 (Design §6.2 / §2.6, F9-AC2).
 *
 * 색 + 아이콘 + 한글 라벨 **3중 인코딩**. 색만으로 식별하지 않는다(F9-AC4).
 * - 기본형(틴트): 옅은 종목색 틴트 배경 + 컬러 아이콘 + 중립 텍스트.
 * - selected(필터 ON): 종목색 채움 + 대비 글자(light=흰색/dark=어두운 글자, ≥4.5:1 확보 §6.2).
 * - dot: 캘린더 셀용 6px 점(라벨 없음, 셀 합계 숫자가 라벨 대신).
 *
 * light/dark 공통 처리: `light-dark()`로 meta.color / meta.colorDark를 자동 전환.
 * (전역 테마가 `color-scheme`를 light/dark로 지정 → 별도 분기/‘use client’ 불필요)
 *
 * 표시 전용(상호작용 없음) → 서버 컴포넌트.
 */

export type DisciplineChipSize = 'dot' | 'xs' | 'sm';

export interface DisciplineChipProps {
  discipline: Discipline;
  /** 'dot'(6px 점) | 'xs'(리스트) | 'sm'(카드/헤더). 기본 'sm'. */
  size?: DisciplineChipSize;
  /** 필터 ON 상태 — 종목색 채움 + 흰 텍스트. */
  selected?: boolean;
  className?: string;
}

/** size별 칩 컨테이너 클래스 (dot 제외). */
const CONTAINER_SIZE: Record<Exclude<DisciplineChipSize, 'dot'>, string> = {
  xs: 'gap-1 px-1.5 py-0.5 text-button-xxs rounded-xxs',
  sm: 'gap-1.5 px-2 py-1 text-button-xs rounded-xxs',
};

/** size별 아이콘 픽셀 크기. */
const ICON_SIZE: Record<Exclude<DisciplineChipSize, 'dot'>, number> = {
  xs: 12,
  sm: 14,
};

export function DisciplineChip({
  discipline,
  size = 'sm',
  selected = false,
  className,
}: DisciplineChipProps) {
  const meta = DISCIPLINE_META[discipline];

  // 활성 종목색: light 표면=color, dark 표면=colorDark (color-scheme 따라 자동 전환).
  const disc = `light-dark(${meta.color}, ${meta.colorDark})`;
  // 옅은 틴트: 종목색 12% + 투명 (Design §6.2 — dark에서도 12% 알파로 동일 처리).
  const tint = `color-mix(in srgb, ${disc} 12%, transparent)`;

  // selected(색 채움) 위 텍스트/아이콘 색 — 대비 ≥4.5:1 확보 (Design §6.2).
  // light 표면(어두운 종목색 위)=흰색(--text-on-primary), dark 표면(밝은 dark 틴트 위)=어두운 글자.
  // ※ --text-strong은 dark 테마에서 흰색이라 못 쓰고, 항상 어두운 토큰(gray-900)을 직접 참조.
  const onFillText = `light-dark(var(--text-on-primary), var(--color-gray-900))`;
  // mma의 dark 종목색(#8b5cf6)만 어두운 글자 기준 대비가 4.18로 미달 → selected 채움에 한해 10% 밝게 보정.
  // (dot/tint/아이콘이 공유하는 disc는 건드리지 않고, selected 배경에만 별도 적용)
  const selectedFillDark =
    discipline === 'mma' ? `color-mix(in srgb, ${meta.colorDark}, white 10%)` : meta.colorDark;
  const selectedFill = `light-dark(${meta.color}, ${selectedFillDark})`;

  // dot — 캘린더 셀용. 색+점 형태 + sr-only 텍스트로 색약 대응(F9-AC4).
  if (size === 'dot') {
    return (
      <span
        role="img"
        aria-label={meta.label}
        title={meta.label}
        className={`inline-block size-1.5 shrink-0 rounded-full${className ? ` ${className}` : ''}`}
        style={{ backgroundColor: disc }}
      >
        <span className="sr-only">{meta.label}</span>
      </span>
    );
  }

  const style: CSSProperties = selected
    ? { backgroundColor: selectedFill, color: onFillText }
    : { backgroundColor: tint, color: 'var(--text-default)' };

  // selected면 아이콘도 글자색(onFillText) 상속(currentColor), 기본형은 종목색.
  const iconStyle: CSSProperties | undefined = selected ? undefined : { color: disc };

  return (
    <span
      role="img"
      aria-label={meta.label}
      title={meta.label}
      className={`inline-flex max-w-full items-center whitespace-nowrap align-middle ${CONTAINER_SIZE[size]}${
        className ? ` ${className}` : ''
      }`}
      style={style}
    >
      <DisciplineIcon
        discipline={discipline}
        width={ICON_SIZE[size]}
        height={ICON_SIZE[size]}
        className="shrink-0"
        style={iconStyle}
      />
      <span className="truncate">{meta.label}</span>
    </span>
  );
}
