'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { CalendarMonthGrid } from '@/features/calendar-view';
import { DayDetail } from '@/widgets/day-detail';
import { fetchCalendarDaySummaries, fetchDaySessions } from '@/entities/session';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { ChevronLeftIcon, IconButton, PlusIcon, TodayIcon } from '@/shared/ui';
import { useSessionEditorStore } from '@/shared/model/session-editor-store';

/**
 * CalendarScreen — F2 캘린더 홈 클라이언트 아일랜드 (Design §7a / §7b / §8 / PRD F2).
 *
 * FSD 메모: 이 컴포넌트는 **app 레이어**라 features(calendar-view) + widgets(day-detail)를
 * 함께 조합할 수 있다. 월 그리드(feature)와 Day Detail(widget)이 공유해야 하는
 * `selectedDate`/`activeStartDate` 상태를 여기로 끌어올려(lift) 양쪽에 props로 내린다
 * → feature↔widget 직접 import 없이 상태 공유(레이어 규칙 준수).
 *
 * 데이터: TanStack Query로 calendar_day_summary(월 가시범위) + 선택일 sessions(+종목)를
 * 읽는다. 두 쿼리 모두 `enabled: isAuthEnabled()` 로 게이팅 — AUTH ON(현재)이면 실데이터,
 * AUTH OFF(개발 셸)면 비활성 → 기본값({}/[])이 유지되어 휴면 빈 상태(빈 달 + EmptyState)로
 * 폴백한다(Supabase 호출 없음, infra-last 보존). 저장(F3)은 ['calendar'] 키를 invalidate해 갱신.
 *
 * 날짜 처리는 전부 클라이언트(dayjs/new Date)지만, 딥링크 초기값(?date)은 서버 page가 읽어
 * `initialDateISO` prop으로 내려준다(useSearchParams/Suspense 회피). (app)은 점등 후 동적 `ƒ`.
 */

/** dayjs 기본 로케일이 영어라 월 라벨은 직접 조립("2026년 5월"). */
function monthLabel(date: Date): string {
  const d = dayjs(date);
  return `${d.year()}년 ${d.month() + 1}월`;
}

/** 딥링크 초기 선택일 — 유효한 'YYYY-MM-DD'면 그 날, 아니면 오늘. (page가 형식 검증 후 내려줌) */
function resolveInitialDate(iso: string | null | undefined): Date {
  if (iso) {
    const d = dayjs(iso);
    if (d.isValid()) return d.toDate();
  }
  return new Date();
}

export interface CalendarScreenProps {
  /** 딥링크 `?date=YYYY-MM-DD` 초기 선택일(검증된 형식 또는 null). 없으면 오늘. */
  initialDateISO?: string | null;
}

export function CalendarScreen({ initialDateISO = null }: CalendarScreenProps) {
  // 초기값: 딥링크 date(선택일) / 그 달(표시). page가 key로 remount하므로 mount-time 1회 결정으로 충분.
  const initialDate = resolveInitialDate(initialDateISO);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [activeStartDate, setActiveStartDate] = useState<Date>(() =>
    dayjs(initialDate).startOf('month').toDate(),
  );

  // 세션 에디터 오픈(F3) — shared 오버레이 스토어. 선택 날짜를 프리셋한다.
  const openEditor = useSessionEditorStore((s) => s.open);

  // 월간 그리드 가시 범위 — 6주 그리드의 이웃 달 셀까지 점이 찍히도록 달 경계 ±7일로 넓힌다.
  const rangeStart = dayjs(activeStartDate).startOf('month').subtract(7, 'day').format('YYYY-MM-DD');
  const rangeEnd = dayjs(activeStartDate).endOf('month').add(7, 'day').format('YYYY-MM-DD');

  // calendar_day_summary(월 가시범위) → 'YYYY-MM-DD' 키 맵. 키는 표시 달(YYYY-MM)로 캐싱.
  // enabled: isAuthEnabled() — OFF면 비활성 → 기본 {}(휴면 빈 달) 유지.
  const { data: daySummaries = {} } = useQuery({
    queryKey: ['calendar', 'summaries', dayjs(activeStartDate).format('YYYY-MM')],
    queryFn: () => fetchCalendarDaySummaries(rangeStart, rangeEnd),
    enabled: isAuthEnabled(),
  });

  // 선택 날짜의 sessions(+종목). enabled OFF면 기본 [](휴면 → DayDetail EmptyState).
  const selectedKey = dayjs(selectedDate).format('YYYY-MM-DD');
  const { data: sessions = [] } = useQuery({
    queryKey: ['calendar', 'day', selectedKey],
    queryFn: () => fetchDaySessions(selectedKey),
    enabled: isAuthEnabled(),
  });

  const goPrevMonth = () => setActiveStartDate((d) => dayjs(d).subtract(1, 'month').startOf('month').toDate());
  const goNextMonth = () => setActiveStartDate((d) => dayjs(d).add(1, 'month').startOf('month').toDate());
  const goToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setActiveStartDate(dayjs(today).startOf('month').toDate());
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── 상단바: 월 네비 ‹ YYYY년 M월 › + 뷰탭 [월]/주/아젠다 + 오늘로 + 세션 (Design §7a) ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {/* 월 네비 */}
        <div className="flex items-center gap-1">
          <IconButton aria-label="이전 달" size="sm" onClick={goPrevMonth}>
            <ChevronLeftIcon width={20} height={20} />
          </IconButton>
          <h1
            className="min-w-[7.5rem] text-center text-heading-l text-[var(--text-strong)] tabular-nums"
            aria-live="polite"
          >
            {monthLabel(activeStartDate)}
          </h1>
          <IconButton aria-label="다음 달" size="sm" onClick={goNextMonth}>
            {/* ChevronLeft를 좌우반전해 우향 화살표로 재사용(아이콘 추가 없이). */}
            <ChevronLeftIcon width={20} height={20} className="-scale-x-100" />
          </IconButton>
          <button
            type="button"
            onClick={goToday}
            className="ml-1 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xxs px-2.5 text-button-s text-[var(--text-default)] outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] pointer-hover:bg-[var(--surface-sunken)] focus-visible:shadow-[var(--ring-focus)]"
          >
            <TodayIcon width={16} height={16} />
            오늘로
          </button>
        </div>

        {/* 뷰탭 + 세션 추가 */}
        <div className="flex items-center gap-2">
          {/* 월/주/아젠다 — 주·아젠다는 P1(비활성). */}
          <div
            role="tablist"
            aria-label="캘린더 뷰"
            className="inline-flex items-center gap-0.5 rounded-xs bg-[var(--surface-sunken)] p-0.5"
          >
            <span
              role="tab"
              aria-selected="true"
              className="inline-flex h-7 items-center rounded-xxs bg-[var(--surface-base)] px-2.5 text-button-xs text-[var(--text-strong)] shadow-e1"
            >
              월
            </span>
            <span
              role="tab"
              aria-selected="false"
              aria-disabled="true"
              title="P1"
              className="inline-flex h-7 cursor-not-allowed items-center rounded-xxs px-2.5 text-button-xs text-[var(--text-disabled)]"
            >
              주
            </span>
            <span
              role="tab"
              aria-selected="false"
              aria-disabled="true"
              title="P1"
              className="inline-flex h-7 cursor-not-allowed items-center rounded-xxs px-2.5 text-button-xs text-[var(--text-disabled)]"
            >
              아젠다
            </span>
          </div>

          {/* 세션 에디터 오픈(F3) — 선택 날짜 프리셋. 전역 FAB와 함께 진입점. */}
          <button
            type="button"
            onClick={() =>
              openEditor({
                mode: 'create',
                presetDate: dayjs(selectedDate).format('YYYY-MM-DD'),
              })
            }
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xxs px-2.5 text-button-s text-[var(--text-default)] outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] pointer-hover:bg-[var(--surface-sunken)] focus-visible:shadow-[var(--ring-focus)]"
          >
            <PlusIcon width={16} height={16} />
            세션
          </button>
        </div>
      </div>

      {/* ── 본문: 데스크톱(lg+) 그리드+상세 좌우, 그 아래는 세로 스택 (Design §10.2) ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* 월간 그리드(feature) — daySummaries: AUTH ON이면 실데이터, OFF면 빈 맵(휴면) */}
        <CalendarMonthGrid
          daySummaries={daySummaries}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          activeStartDate={activeStartDate}
          onActiveStartDateChange={setActiveStartDate}
        />

        {/* Day Detail(widget) — sessions: AUTH ON이면 실데이터, OFF면 빈 배열 → EmptyState */}
        <DayDetail selectedDate={selectedDate} sessions={sessions} />
      </div>
    </div>
  );
}
