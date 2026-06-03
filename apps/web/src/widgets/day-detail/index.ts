/**
 * widgets/day-detail 공개 API (FSD).
 * 앱 레이어가 Day Detail + 주/아젠다 뷰 + 그룹핑 헬퍼를 단일 진입점으로 가져다 쓴다.
 * NOTE: 순수 lib(calendar-grouping)와 클라이언트 컴포넌트를 함께 노출한다. 현재 소비자는 모두
 * 클라이언트(app 섬)라 안전하지만, 서버 컴포넌트에서 날짜 헬퍼만 필요하면 './lib/calendar-grouping'을
 * 직접 import 할 것(배럴 경유 시 클라이언트 컴포넌트 그래프가 딸려옴).
 */
export { DayDetail } from './ui/DayDetail';
export type { DayDetailProps } from './ui/DayDetail';
export { SessionCard } from './ui/SessionCard';
export type { SessionCardProps } from './ui/SessionCard';
export { CalendarWeekView } from './ui/CalendarWeekView';
export type { CalendarWeekViewProps } from './ui/CalendarWeekView';
export { CalendarAgendaView } from './ui/CalendarAgendaView';
export type { CalendarAgendaViewProps } from './ui/CalendarAgendaView';
export {
  KR_WEEKDAYS,
  weekRange,
  buildWeekDays,
  groupSessionsByDateMap,
  groupSessionsByDateDesc,
  krDateHeader,
} from './lib/calendar-grouping';
export type { WeekDay } from './lib/calendar-grouping';
