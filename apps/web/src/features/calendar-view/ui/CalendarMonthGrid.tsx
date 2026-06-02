'use client';

import Calendar from 'react-calendar';
import type { TileArgs } from 'react-calendar';
import dayjs from 'dayjs';

/**
 * react-calendar의 onChange value 타입 — 패키지 루트에서 `Value`를 re-export하지 않아
 * (index.d.ts는 TileArgs 등만 노출) 동일 형태를 로컬에 정의한다.
 * 단일 선택 + returnValue 기본 'start' → 실제로는 Date | null 만 들어온다.
 */
type CalendarValue = Date | null | [Date | null, Date | null];

import type { CalendarDaySummaryMap } from '@/entities/session';

import { DayCellContent } from './DayCellContent';
import './calendar-view.css';

/**
 * CalendarMonthGrid — react-calendar 기반 노션형 월간 그리드 (Design §7a / §8 / F2).
 *
 * 월 네비게이션은 앱 레벨 상단바가 소유(‹ YYYY년 M월 ›) → `showNavigation={false}`.
 * 셀 렌더는 전부 커스텀:
 *  - `tileContent`: 종목 점 + 세션 수(DayCellContent). month view에서만.
 *  - `tileClassName`: 오늘/선택/기록/빈 상태 클래스 → calendar-view.css가 시각화.
 * 일요일 시작(`calendarType="gregory"`), 한글 요일/숫자(dayjs).
 *
 * react-calendar는 클라이언트 전용 → 이 래퍼는 'use client'.
 * 상태(selectedDate/activeStartDate)는 소유하지 않고 props로만 받는 제어 컴포넌트
 * (FSD: feature↔widget 간 상태 공유는 app 레벨 클라이언트 아일랜드가 책임).
 */

export interface CalendarMonthGridProps {
  /** 'YYYY-MM-DD' → 일별 요약 맵. 빈 객체면 모든 날이 빈 셀. */
  daySummaries: CalendarDaySummaryMap;
  /** 현재 선택된 날(빨강 ring). */
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  /** 표시 중인 달의 시작일(월 네비와 동기). */
  activeStartDate: Date;
  onActiveStartDateChange: (date: Date) => void;
}

/** dayjs 'YYYY-MM-DD' 키 — daySummaries 조회 및 오늘 비교의 단일 규칙. */
function dateKey(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

export function CalendarMonthGrid({
  daySummaries,
  selectedDate,
  onSelectDate,
  activeStartDate,
  onActiveStartDateChange,
}: CalendarMonthGridProps) {
  const todayKey = dayjs().format('YYYY-MM-DD');
  const selectedKey = dateKey(selectedDate);

  return (
    <Calendar
      // 제어형: 선택/표시 달을 부모가 소유.
      value={selectedDate}
      activeStartDate={activeStartDate}
      onChange={(value: CalendarValue) => {
        // returnValue 기본 'start' + 단일 선택 → value는 Date | null.
        const next = Array.isArray(value) ? value[0] : value;
        if (next) onSelectDate(next);
      }}
      onActiveStartDateChange={({ activeStartDate: next }) => {
        if (next) onActiveStartDateChange(next);
      }}
      // 일요일 시작 + 한국어 로케일(SSR 하이드레이션 안정화).
      calendarType="gregory"
      locale="ko-KR"
      // 월 네비/드릴은 앱 상단바가 담당 → 내장 네비/뷰 전환 비활성.
      showNavigation={false}
      minDetail="month"
      maxDetail="month"
      // 6주 고정 + 이웃 달 노출(노션형 꽉 찬 그리드).
      showFixedNumberOfWeeks
      showNeighboringMonth
      // 한글 요일(일~토) / 숫자(일자만) — dayjs로 통일.
      formatShortWeekday={(_locale, date) => ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]}
      formatDay={(_locale, date) => String(date.getDate())}
      // 셀 콘텐츠: 종목 점 + 세션 수 (month view 한정).
      tileContent={({ date, view }: TileArgs) =>
        view === 'month' ? <DayCellContent summary={daySummaries[dateKey(date)]} /> : null
      }
      // 셀 상태 클래스: 기록/빈 (오늘·선택은 react-calendar 내장 --now/--active 사용).
      tileClassName={({ date, view }: TileArgs) => {
        if (view !== 'month') return null;
        const summary = daySummaries[dateKey(date)];
        const logged = !!summary && summary.session_count > 0;
        const classes = [logged ? 'cal-tile--logged' : 'cal-tile--empty'];
        // 선택 셀이 오늘과 같으면 두 신호(ring+disc)가 겹치지만 CSS가 우선순위 처리.
        if (dateKey(date) === selectedKey) classes.push('cal-tile--selected');
        if (dateKey(date) === todayKey) classes.push('cal-tile--today');
        return classes.join(' ');
      }}
    />
  );
}
