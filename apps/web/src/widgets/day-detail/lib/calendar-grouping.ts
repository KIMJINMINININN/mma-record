import dayjs from 'dayjs';

import type { SessionWithDisciplines } from '@/entities/session';

/**
 * 캘린더 주/아젠다 뷰용 순수 그룹핑 헬퍼 (F2 / 구현계획 §3).
 *
 * 주(week)는 **일요일 시작**(월간 그리드 calendarType="gregory"와 동일 컨벤션, 별도 dayjs 플러그인 없음).
 * 날짜 문자열은 'YYYY-MM-DD'(KST). React/Supabase 의존 없음(dayjs + 타입만) → node 단위 테스트 용이.
 */

const DATE_FMT = 'YYYY-MM-DD';

/** dayjs 기본 로케일이 영어라 한글 요일은 직접 매핑(추가 로케일 의존 회피). */
export const KR_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 선택일이 속한 주(일요일~토요일)의 시작/끝 'YYYY-MM-DD'. */
export function weekRange(selected: Date): { startISO: string; endISO: string } {
  const d = dayjs(selected);
  const start = d.subtract(d.day(), 'day'); // day(): 0=일
  return { startISO: start.format(DATE_FMT), endISO: start.add(6, 'day').format(DATE_FMT) };
}

export interface WeekDay {
  dateISO: string;
  weekdayKR: string;
  dayOfMonth: number;
  isToday: boolean;
}

/** 주 시작일부터 7일(일~토). `today`(기본 오늘)와 같은 날만 isToday. */
export function buildWeekDays(startISO: string, today: string = dayjs().format(DATE_FMT)): WeekDay[] {
  const start = dayjs(startISO);
  return Array.from({ length: 7 }, (_, i) => {
    const day = start.add(i, 'day');
    const dateISO = day.format(DATE_FMT);
    return { dateISO, weekdayKR: KR_WEEKDAYS[day.day()], dayOfMonth: day.date(), isToday: dateISO === today };
  });
}

/** trained_on 키 → 세션 배열 맵(입력 순서/내용 비변형). */
export function groupSessionsByDateMap(
  sessions: SessionWithDisciplines[],
): Record<string, SessionWithDisciplines[]> {
  const map: Record<string, SessionWithDisciplines[]> = {};
  for (const s of sessions) {
    if (!map[s.trained_on]) map[s.trained_on] = [];
    map[s.trained_on].push(s);
  }
  return map;
}

/** 날짜 내림차순 그룹(아젠다용). 그룹 내부 순서는 입력 순서 보존(= trained_on/created_at asc). */
export function groupSessionsByDateDesc(
  sessions: SessionWithDisciplines[],
): { dateISO: string; sessions: SessionWithDisciplines[] }[] {
  const map = groupSessionsByDateMap(sessions);
  return Object.keys(map)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)) // 'YYYY-MM-DD' 사전순 역 = 날짜 내림차순
    .map((dateISO) => ({ dateISO, sessions: map[dateISO] }));
}

/** "M월 D일 (요일)" — DayDetail/주·아젠다 헤더 공통. */
export function krDateHeader(dateISO: string): string {
  const d = dayjs(dateISO);
  return `${d.month() + 1}월 ${d.date()}일 (${KR_WEEKDAYS[d.day()]})`;
}
