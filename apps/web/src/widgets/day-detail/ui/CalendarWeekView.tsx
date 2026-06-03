import dayjs from 'dayjs';

import type { SessionWithDisciplines } from '@/entities/session';

import { SessionCard } from './SessionCard';
import { AddSessionButton } from './AddSessionButton';
import { buildWeekDays } from '../lib/calendar-grouping';

/**
 * CalendarWeekView — 주간(일~토) 세션 리스트 (Design §8 "주간=시간축 리스트" / F2-AC6).
 *
 * 7개 날짜 블록을 일요일부터 세로로 나열한다. 세션 시간(time-of-day) 컬럼이 DB에 없으므로
 * 시각 그리드가 아닌 **날짜별 그룹 리스트**(trained_on/created_at 순). 각 날짜에 빠른추가 버튼.
 * 제어 컴포넌트(상태 없음) — 주 시작/그룹맵은 app 레이어가 props로 내린다.
 */

export interface CalendarWeekViewProps {
  /** 주 시작(일요일) 'YYYY-MM-DD'. */
  weekStartISO: string;
  /** trained_on 키 → 그 날 세션들(app이 groupSessionsByDateMap으로 구성). */
  sessionsByDate: Record<string, SessionWithDisciplines[]>;
}

export function CalendarWeekView({ weekStartISO, sessionsByDate }: CalendarWeekViewProps) {
  const days = buildWeekDays(weekStartISO);

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const sessions = sessionsByDate[day.dateISO] ?? [];
        // 날짜 블록은 h2(페이지 h1 바로 아래 콘텐츠 섹션)로 헤딩 위계를 잇고, region 랜드마크는
        // 쓰지 않는다(7개 region = 랜드마크 노이즈). 헤딩만으로 SR 탐색에 충분.
        return (
          <div key={day.dateISO}>
            <header className="mb-2 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-heading-xs text-[var(--text-strong)]">
                <span className={day.isToday ? 'text-[var(--primary)]' : undefined}>
                  {day.dayOfMonth}일
                </span>
                <span className="text-body-s-400 text-[var(--text-muted)]">({day.weekdayKR})</span>
                {day.isToday && (
                  <span className="rounded-xxs bg-[var(--primary-soft)] px-1.5 py-0.5 text-body-xxs-500 text-[var(--primary)]">
                    오늘
                  </span>
                )}
              </h2>
              <AddSessionButton date={dayjs(day.dateISO).toDate()} variant="secondary" size="sm" label="추가" />
            </header>

            {sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <p className="rounded-m border border-dashed border-[var(--border-default)] px-3 py-2 text-body-xs-400 text-[var(--text-muted)]">
                기록 없음
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
