'use client';

import { useRef, type KeyboardEvent } from 'react';

import { STAT_PERIODS, type StatPeriod } from '@/entities/session';

/**
 * PeriodFilter — 통계 기간 세그먼트 토글 (F10 P2).
 *
 * STAT_PERIODS(전체/6개월/3개월/1개월)를 radiogroup으로 노출(←→ 키 순환 — FrequencyChart 관용구).
 * 선택은 primary 칠. 기간은 집계량 지표(매트타임·종목분포·포지션·최다복습)에만 적용 —
 * 시계열 지표(스트릭·빈도)는 전체 유지(상위 StatsScreen이 분리 전달).
 */
export interface PeriodFilterProps {
  value: StatPeriod;
  onChange: (period: StatPeriod) => void;
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const refs = useRef<Record<StatPeriod, HTMLButtonElement | null>>({
    all: null,
    '6m': null,
    '3m': null,
    '1m': null,
  });

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const idx = STAT_PERIODS.findIndex((p) => p.id === value);
    const len = STAT_PERIODS.length;
    const nextIdx = e.key === 'ArrowRight' ? (idx + 1) % len : (idx - 1 + len) % len;
    const next = STAT_PERIODS[nextIdx].id;
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label="통계 기간" className="flex items-center gap-1" onKeyDown={onKeyDown}>
      {STAT_PERIODS.map((p) => {
        const selected = value === p.id;
        return (
          <button
            key={p.id}
            ref={(el) => {
              refs.current[p.id] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(p.id)}
            className={`rounded-xxs px-2.5 py-1 text-button-xs transition-colors duration-[var(--duration-fast)] focus-visible:shadow-[var(--ring-focus)] focus-visible:outline-none ${
              selected
                ? 'bg-[var(--primary)] text-[var(--text-on-primary)]'
                : 'text-[var(--text-muted)] pointer-hover:bg-[var(--surface-sunken)]'
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
