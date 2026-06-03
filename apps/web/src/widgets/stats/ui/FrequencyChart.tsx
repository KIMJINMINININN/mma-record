'use client';

import { useRef, useState, type KeyboardEvent } from 'react';

import type { FrequencyBucket } from '@/entities/session';

/**
 * FrequencyChart — 훈련 빈도 컬럼 차트 + 주간/월간 토글 (F10 §S3 / 구현계획).
 *
 * 순수 CSS 컬럼(높이 %), 차트 라이브러리 없음. 주간 모드에만 "목표 주 N회" 점선 기준선 +
 * 달성(count≥goal) 컬럼을 빨강 신호로. 0 버킷도 1px stub로 공백을 명시.
 * 색 단독 인코딩 금지: sr-only 데이터 요약(aria-live=polite — 토글 시 새 데이터 안내).
 * 기간 토글은 단일 차트를 바꾸는 것이라 tab(+tabpanel)이 아닌 **radiogroup**(role=radio, ←→ 키).
 */

export interface FrequencyChartProps {
  weekly: FrequencyBucket[];
  monthly: FrequencyBucket[];
  /** 주간 모드 목표선(주 N회). 기본 3(PRD §10 습관 신호). */
  weeklyGoal?: number;
}

type Period = 'week' | 'month';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: '주간' },
  { id: 'month', label: '월간' },
];

export function FrequencyChart({ weekly, monthly, weeklyGoal = 3 }: FrequencyChartProps) {
  const [period, setPeriod] = useState<Period>('week');
  const tabRefs = useRef<Record<Period, HTMLButtonElement | null>>({ week: null, month: null });

  const isWeek = period === 'week';
  const buckets = isWeek ? weekly : monthly;
  const chartMax = Math.max(1, ...buckets.map((b) => b.count), isWeek ? weeklyGoal : 1);
  const goalsMet = isWeek ? buckets.filter((b) => b.count >= weeklyGoal).length : 0;
  const summary = isWeek
    ? `최근 ${buckets.length}주 주간 세션 수, 목표 주 ${weeklyGoal}회 달성 ${goalsMet}주`
    : `최근 ${buckets.length}개월 월간 세션 수`;

  function onPeriodKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next: Period = isWeek ? 'month' : 'week';
    setPeriod(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)] md:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-heading-xs text-[var(--text-strong)]">훈련 빈도</h2>
        <div role="radiogroup" aria-label="빈도 기간" className="flex items-center gap-1" onKeyDown={onPeriodKeyDown}>
          {PERIODS.map((p) => {
            const selected = period === p.id;
            return (
              <button
                key={p.id}
                ref={(el) => {
                  tabRefs.current[p.id] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setPeriod(p.id)}
                style={{ borderBottom: `2px solid ${selected ? 'var(--primary)' : 'transparent'}` }}
                className={`rounded-xxs px-2 py-1.5 text-button-xs focus-visible:shadow-[var(--ring-focus)] focus-visible:outline-none ${
                  selected ? 'text-[var(--text-strong)]' : 'text-[var(--text-muted)]'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <div className="relative flex h-36 items-end gap-1 border-b border-[var(--border-subtle)]">{/* 막대는 aria-hidden — 데이터는 아래 aria-live sr-only 요약이 단독 제공 */}
          {isWeek && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[var(--border-strong)]"
              style={{ bottom: `${(weeklyGoal / chartMax) * 100}%` }}
            >
              <span className="absolute -top-4 right-0 text-body-xxs-400 text-[var(--text-muted)]">
                목표 주 {weeklyGoal}회
              </span>
            </div>
          )}
          {buckets.map((b) => {
            const filled = b.count > 0;
            const goalMet = isWeek && b.count >= weeklyGoal;
            return (
              <div key={b.key} className="flex h-full flex-1 items-end" title={`${b.label} · ${b.count}회`}>
                <span
                  aria-hidden="true"
                  className={`block w-full rounded-t-xs ${
                    !filled
                      ? 'bg-[var(--border-default)]'
                      : goalMet
                        ? 'bg-[var(--primary)]'
                        : 'bg-[var(--text-default)]'
                  }`}
                  style={{ height: filled ? `${(b.count / chartMax) * 100}%` : '1px' }}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-1 flex gap-1">
          {buckets.map((b, i) => (
            <span
              key={b.key}
              aria-hidden="true"
              className="flex-1 text-center text-body-xxs-400 tabular-nums text-[var(--text-muted)]"
            >
              {(buckets.length - 1 - i) % 3 === 0 ? b.label : ''}
            </span>
          ))}
        </div>

        <p className="sr-only" aria-live="polite">
          {summary}. {buckets.map((b) => `${b.label} ${b.count}회`).join(', ')}
        </p>
      </div>
    </section>
  );
}
