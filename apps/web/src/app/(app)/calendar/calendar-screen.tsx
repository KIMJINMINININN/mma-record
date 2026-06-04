'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { CalendarMonthGrid } from '@/features/calendar-view';
import {
  CalendarAgendaView,
  CalendarWeekView,
  DayDetail,
  groupSessionsByDateMap,
  weekRange,
} from '@/widgets/day-detail';
import {
  fetchCalendarDaySummaries,
  fetchDaySessions,
  fetchFavoriteSessions,
  fetchRangeSessions,
} from '@/entities/session';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { ChevronLeftIcon, IconButton, PlusIcon, StarFilledIcon, StarIcon, TodayIcon } from '@/shared/ui';
import { useSessionEditorStore } from '@/shared/model/session-editor-store';

/**
 * CalendarScreen — F2 캘린더 홈 클라이언트 아일랜드 (Design §7a / §7b / §8 / PRD F2).
 *
 * FSD 메모: 이 컴포넌트는 **app 레이어**라 features(calendar-view) + widgets(day-detail)를
 * 함께 조합할 수 있다. 월 그리드(feature)와 Day Detail·주/아젠다 뷰(widget)가 공유하는
 * `selectedDate`/`activeStartDate`/`viewMode` 상태를 여기로 끌어올려(lift) props로 내린다
 * → feature↔widget 직접 import 없이 상태 공유(레이어 규칙 준수).
 *
 * 뷰(F2-AC6): 월(그리드+상세) / 주(일~토 리스트) / 아젠다(달 세션 날짜 내림차순). viewMode는
 * **컴포넌트 state**로만 둔다(URL 아님) → `?date` 딥링크 계약(resultHref/search.test) 보존.
 * 데이터는 뷰별로 게이팅: 월=요약+선택일 / 주=주 범위 / 아젠다=달 범위(fetchRangeSessions).
 * 모두 `enabled: isAuthEnabled()`(+ 해당 뷰일 때만) — AUTH OFF면 비활성→휴면 빈 상태.
 *
 * 날짜 처리는 전부 클라이언트(dayjs/new Date)지만, 딥링크 초기값(?date)은 서버 page가 읽어
 * `initialDateISO` prop으로 내려준다. (app)은 점등 후 동적 `ƒ`.
 */

type CalendarViewMode = 'month' | 'week' | 'agenda' | 'favorites';

const VIEW_TABS: { id: CalendarViewMode; label: string }[] = [
  { id: 'month', label: '월' },
  { id: 'week', label: '주' },
  { id: 'agenda', label: '아젠다' },
  { id: 'favorites', label: '즐겨찾기' },
];

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
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  // 즐겨찾기만 보기(PRD §9 P1) — 세션 목록(월 상세/주/아젠다)에 적용하는 기간내 필터.
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const tabRefs = useRef<Record<CalendarViewMode, HTMLButtonElement | null>>({
    month: null,
    week: null,
    agenda: null,
    favorites: null,
  });

  // 세션 에디터 오픈(F3) — shared 오버레이 스토어. 선택/지정 날짜를 프리셋한다.
  const openEditor = useSessionEditorStore((s) => s.open);
  const quickAdd = (date: Date) =>
    openEditor({ mode: 'create', presetDate: dayjs(date).format('YYYY-MM-DD') });

  // ── 범위 계산 ──────────────────────────────────────────────────────────
  // 월간 그리드 가시 범위 — 6주 그리드의 이웃 달 셀까지 점이 찍히도록 달 경계 ±7일.
  const rangeStart = dayjs(activeStartDate).startOf('month').subtract(7, 'day').format('YYYY-MM-DD');
  const rangeEnd = dayjs(activeStartDate).endOf('month').add(7, 'day').format('YYYY-MM-DD');
  // 주(일~토) 범위 — 선택일 기준.
  const { startISO: weekStartISO, endISO: weekEndISO } = weekRange(selectedDate);
  // 아젠다 = 표시 달 전체.
  const monthKey = dayjs(activeStartDate).format('YYYY-MM');
  const monthStartISO = dayjs(activeStartDate).startOf('month').format('YYYY-MM-DD');
  const monthEndISO = dayjs(activeStartDate).endOf('month').format('YYYY-MM-DD');

  const authed = isAuthEnabled();

  // ── 데이터 (뷰별 게이팅) ──────────────────────────────────────────────
  // 월: calendar_day_summary(가시범위) → 'YYYY-MM-DD' 키 맵.
  const { data: daySummaries = {} } = useQuery({
    queryKey: ['calendar', 'summaries', monthKey],
    queryFn: () => fetchCalendarDaySummaries(rangeStart, rangeEnd),
    enabled: authed && viewMode === 'month',
  });
  // 월: 선택 날짜의 sessions(+종목) → DayDetail.
  const selectedKey = dayjs(selectedDate).format('YYYY-MM-DD');
  const { data: sessions = [] } = useQuery({
    queryKey: ['calendar', 'day', selectedKey],
    queryFn: () => fetchDaySessions(selectedKey),
    enabled: authed && viewMode === 'month',
  });
  // 주: 주 범위 sessions → 날짜별 그룹맵 → WeekView.
  const { data: weekSessions = [] } = useQuery({
    queryKey: ['calendar', 'week', weekStartISO, weekEndISO],
    queryFn: () => fetchRangeSessions(weekStartISO, weekEndISO),
    enabled: authed && viewMode === 'week',
  });
  // 아젠다: 표시 달 범위 sessions → AgendaView(날짜 내림차순).
  const { data: agendaSessions = [] } = useQuery({
    queryKey: ['calendar', 'agenda', monthKey],
    queryFn: () => fetchRangeSessions(monthStartISO, monthEndISO),
    enabled: authed && viewMode === 'agenda',
  });
  // 즐겨찾기: 전 기간 is_favorite 세션(cross-month) → AgendaView 재사용(최신순). 기간 무관 단일 쿼리.
  // 저장/토글 후 ['calendar'] 프리픽스 invalidate가 이 키도 함께 갱신(SessionEditorForm·FavoriteStar).
  const { data: favoriteSessions = [] } = useQuery({
    queryKey: ['calendar', 'favorites'],
    queryFn: fetchFavoriteSessions,
    enabled: authed && viewMode === 'favorites',
  });

  // "즐겨찾기만" 기간내 필터 — 세 세션 목록(월 상세/주/아젠다)에 동일 적용. 월 그리드 점/카운트는
  // calendar_day_summary(별도 소스)라 영향 없음(요약 뷰는 전체 집계 유지 — 문서화된 의도).
  const favFilter = (list: typeof sessions) => (favoritesOnly ? list.filter((s) => s.is_favorite) : list);
  const daySessions = favFilter(sessions);
  const weekFiltered = favFilter(weekSessions);
  const weekByDate = groupSessionsByDateMap(weekFiltered);
  const agenda = favFilter(agendaSessions);
  // 활성 뷰의 (즐겨찾기 필터 후) 세션 수 — 토글 시 SR 안내용(WCAG 4.1.3).
  const activeCount =
    viewMode === 'week' ? weekFiltered.length : viewMode === 'agenda' ? agenda.length : daySessions.length;
  // 즐겨찾기 뷰 = cross-month 컬렉션 → 기간 네비/오늘로/즐겨찾기만 토글을 숨긴다(기간 모델과 무관).
  const isFavorites = viewMode === 'favorites';

  // ── 네비게이션 (모드별) ────────────────────────────────────────────────
  // 월 네비 — 표시 달과 선택일을 **함께** 이동(선택일은 새 달의 같은 일자, 말일 초과 시 클램프).
  // 두 포인터(selectedDate/activeStartDate)를 단일 "현재 기간"으로 동기화 → 월↔주 전환 시 주 뷰가
  // 보던 달의 주를 보여주고, 월 그리드와 DayDetail의 달이 어긋나(선택 링 소실) 보이지 않는다.
  const shiftMonth = (deltaMonths: number) => {
    const nextStart = dayjs(activeStartDate).add(deltaMonths, 'month').startOf('month');
    const day = Math.min(dayjs(selectedDate).date(), nextStart.daysInMonth());
    setActiveStartDate(nextStart.toDate());
    setSelectedDate(nextStart.date(day).toDate());
  };
  const shiftWeek = (deltaWeeks: number) => {
    const next = dayjs(selectedDate).add(deltaWeeks * 7, 'day');
    setSelectedDate(next.toDate());
    setActiveStartDate(next.startOf('month').toDate());
  };
  const goPrev = () => (viewMode === 'week' ? shiftWeek(-1) : shiftMonth(-1));
  const goNext = () => (viewMode === 'week' ? shiftWeek(1) : shiftMonth(1));
  const goToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setActiveStartDate(dayjs(today).startOf('month').toDate());
  };

  // 상단 라벨 — 주 모드는 주 범위, 그 외는 표시 달.
  const headerLabel =
    viewMode === 'week'
      ? `${dayjs(weekStartISO).month() + 1}월 ${dayjs(weekStartISO).date()}일 – ${
          dayjs(weekEndISO).month() + 1
        }월 ${dayjs(weekEndISO).date()}일`
      : monthLabel(activeStartDate);

  // 뷰탭 roving tabindex + ←/→.
  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const idx = VIEW_TABS.findIndex((t) => t.id === viewMode);
    const len = VIEW_TABS.length;
    const nextIdx = e.key === 'ArrowRight' ? (idx + 1) % len : (idx - 1 + len) % len;
    const next = VIEW_TABS[nextIdx].id;
    setViewMode(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── 상단바: 월/주 네비 ‹ 라벨 › + 뷰탭 [월][주][아젠다] + 오늘로 + 세션 (Design §7a) ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {/* 네비 — 기간 뷰(월/주/아젠다)만. 즐겨찾기(cross-month)는 기간 네비 없이 제목만. */}
        <div className="flex items-center gap-1">
          {isFavorites ? (
            <h1 className="text-heading-l text-[var(--text-strong)]">즐겨찾기</h1>
          ) : (
            <>
              <IconButton aria-label={viewMode === 'week' ? '이전 주' : '이전 달'} size="sm" onClick={goPrev}>
                <ChevronLeftIcon width={20} height={20} />
              </IconButton>
              <h1
                className="min-w-[7.5rem] text-center text-heading-l text-[var(--text-strong)] tabular-nums"
                aria-live="polite"
              >
                {headerLabel}
              </h1>
              <IconButton aria-label={viewMode === 'week' ? '다음 주' : '다음 달'} size="sm" onClick={goNext}>
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
            </>
          )}
        </div>

        {/* 뷰탭 + 세션 추가 */}
        <div className="flex items-center gap-2">
          {/* 월/주/아젠다 — 활성 탭이 패널(calendar-panel)을 제어. */}
          <div
            role="tablist"
            aria-label="캘린더 뷰"
            className="inline-flex items-center gap-0.5 rounded-xs bg-[var(--surface-sunken)] p-0.5"
            onKeyDown={onTabKeyDown}
          >
            {VIEW_TABS.map((t) => {
              const selected = viewMode === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`cal-tab-${t.id}`}
                  aria-controls="calendar-panel"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setViewMode(t.id)}
                  className={`inline-flex h-7 items-center rounded-xxs px-2.5 text-button-xs outline-none focus-visible:shadow-[var(--ring-focus)] ${
                    selected
                      ? 'bg-[var(--surface-base)] text-[var(--text-strong)] shadow-[var(--shadow-card)]'
                      : 'text-[var(--text-default)] pointer-hover:text-[var(--text-strong)]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* 즐겨찾기만 — 세션 목록(월 상세/주/아젠다)을 즐겨찾기로 거름(PRD §9 P1). aria-pressed 토글.
              즐겨찾기 뷰에선 중복이라 숨긴다(그 뷰 자체가 전 기간 즐겨찾기 전용). */}
          {!isFavorites && (
            <button
              type="button"
              aria-label="즐겨찾기만 보기"
              aria-pressed={favoritesOnly}
              onClick={() => setFavoritesOnly((v) => !v)}
              className={[
                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xxs px-2.5 text-button-s',
                'outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
                'focus-visible:shadow-[var(--ring-focus)]',
                favoritesOnly
                  ? 'bg-[var(--surface-sunken)] text-[var(--primary)]'
                  : 'text-[var(--text-default)] pointer-hover:bg-[var(--surface-sunken)]',
              ].join(' ')}
            >
              {favoritesOnly ? (
                <StarFilledIcon width={16} height={16} />
              ) : (
                <StarIcon width={16} height={16} />
              )}
              즐겨찾기
            </button>
          )}

          {/* 세션 에디터 오픈(F3) — 선택 날짜 프리셋. 전역 FAB와 함께 진입점. */}
          <button
            type="button"
            onClick={() => quickAdd(selectedDate)}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xxs px-2.5 text-button-s text-[var(--text-default)] outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] pointer-hover:bg-[var(--surface-sunken)] focus-visible:shadow-[var(--ring-focus)]"
          >
            <PlusIcon width={16} height={16} />
            세션
          </button>
        </div>
      </div>

      {/* 즐겨찾기만 토글 시 결과 수 변화를 SR에 알린다(WCAG 4.1.3). 끄면 비워 잡음 방지. */}
      <p className="sr-only" role="status" aria-live="polite">
        {favoritesOnly ? `즐겨찾기만 보기 · 세션 ${activeCount}개` : ''}
      </p>

      {/* ── 본문(탭 패널): 뷰모드에 따라 월 그리드+상세 / 주 리스트 / 아젠다 ── */}
      <div role="tabpanel" id="calendar-panel" tabIndex={0} aria-labelledby={`cal-tab-${viewMode}`} className="outline-none">
        {viewMode === 'month' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
            {/* 월간 그리드(feature) — daySummaries: AUTH ON이면 실데이터, OFF면 빈 맵(휴면) */}
            <CalendarMonthGrid
              daySummaries={daySummaries}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              activeStartDate={activeStartDate}
              onActiveStartDateChange={setActiveStartDate}
              onQuickAdd={quickAdd}
            />
            {/* Day Detail(widget) — sessions: AUTH ON이면 실데이터, OFF면 빈 배열 → EmptyState */}
            <DayDetail selectedDate={selectedDate} sessions={daySessions} />
          </div>
        )}

        {viewMode === 'week' && (
          <CalendarWeekView weekStartISO={weekStartISO} sessionsByDate={weekByDate} />
        )}

        {viewMode === 'agenda' && (
          <CalendarAgendaView monthISO={monthKey} sessions={agenda} />
        )}

        {viewMode === 'favorites' && (
          <CalendarAgendaView
            sessions={favoriteSessions}
            emptyTitle="즐겨찾기한 세션이 없습니다"
            emptyDescription="세션 카드의 별표(★)를 누르면 전 기간 즐겨찾기가 여기에 모여요."
          />
        )}
      </div>
    </div>
  );
}
