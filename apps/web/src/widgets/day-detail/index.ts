/**
 * widgets/day-detail 공개 API (FSD).
 * 앱 레이어가 Day Detail + 주/아젠다 뷰 + 그룹핑 헬퍼를 단일 진입점으로 가져다 쓴다.
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
