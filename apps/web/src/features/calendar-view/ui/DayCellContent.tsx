'use client';

import { DisciplineChip } from '@/entities/discipline';
import type { CalendarDaySummary } from '@/entities/session';
import type { Discipline } from '@/shared/model/enums';
import { PlusIcon } from '@/shared/ui';

/**
 * DayCellContent — 월간 그리드 셀의 종목 점 + 세션 수 + 빈 날 빠른추가 (Design §7a / §8 / F2-AC1·AC4).
 *
 * - 기록 있는 날: 종목 점(DisciplineChip dot, 중복 제거, 최대 MAX_DOTS 후 `+N`) + 세션 수 배지.
 * - 빈 날: 호버 시 우하단 `+` 빠른추가(이전 CSS 고스트를 실제 클릭 가능 버튼으로 대체).
 *   react-calendar 타일이 `<button>`이라 그 안의 포커스 가능 요소는 invalid HTML(중첩 인터랙티브).
 *   → `+`는 **포인터 전용**(aria-hidden·비포커스). 클릭은 stopPropagation으로 셀 날짜선택을 막고
 *   onQuickAdd(그 날짜 프리셋 세션 에디터)만 연다. 키보드/SR 추가 경로는 셀 선택→DayDetail 버튼이 담당.
 *
 * 인터랙티브 핸들러를 갖게 되어 'use client'. (부모 CalendarMonthGrid도 'use client')
 */

/** 셀에 노출하는 점 최대 개수 — 초과 시 마지막 슬롯을 `+N`으로. */
const MAX_DOTS = 4;

export interface DayCellContentProps {
  summary: CalendarDaySummary | undefined;
  /** 셀 날짜 — 빈 날 빠른추가 프리셋용. */
  date?: Date;
  /** 빈 날 `+` 빠른추가 핸들러. 없으면 `+` 미표시(읽기 전용 그리드). */
  onQuickAdd?: (date: Date) => void;
  /** 이웃 달 셀이면 `+` 숨김(노이즈 방지). */
  isNeighboringMonth?: boolean;
}

export function DayCellContent({ summary, date, onQuickAdd, isNeighboringMonth }: DayCellContentProps) {
  // 빈 날(요약 없음/세션 0): 콘텐츠 없음. 단, 이번 달 셀 + 핸들러가 있으면 호버용 빠른추가 `+`.
  if (!summary || summary.session_count <= 0) {
    if (!onQuickAdd || !date || isNeighboringMonth) return null;
    const cellDate = date;
    return (
      <span
        aria-hidden="true"
        title="세션 추가"
        className="cal-quick-add"
        onClick={(e) => {
          e.stopPropagation(); // 타일 onChange(날짜선택)와 동시 발화 방지
          onQuickAdd(cellDate);
        }}
      >
        <PlusIcon width={14} height={14} />
      </span>
    );
  }

  // 종목 중복 제거 — DISCIPLINES 정의 순서 유지를 위해 원본 순서로 필터.
  const unique: Discipline[] = [];
  for (const d of summary.disciplines) {
    if (!unique.includes(d)) unique.push(d);
  }

  const visible = unique.slice(0, MAX_DOTS);
  const overflow = unique.length - visible.length;

  return (
    <div className="mt-auto flex w-full items-center gap-1">
      {/* 종목 점들 — 색+aria-label(DisciplineChip dot 내장)로 식별 */}
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        {visible.map((d) => (
          <DisciplineChip key={d} discipline={d} size="dot" />
        ))}
        {overflow > 0 && (
          <span
            className="text-body-xxs-500 leading-none text-[var(--text-muted)] tabular-nums"
            aria-label={`종목 ${overflow}개 더`}
          >
            +{overflow}
          </span>
        )}
      </span>

      {/* 세션 수 — 우측 정렬, 색약 보강 숫자 */}
      <span
        className="ml-auto text-body-xxs-500 leading-none text-[var(--text-muted)] tabular-nums"
        aria-label={`세션 ${summary.session_count}회`}
      >
        {summary.session_count}
      </span>
    </div>
  );
}
