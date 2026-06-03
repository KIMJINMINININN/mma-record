import dayjs from 'dayjs';

import type { SessionWithDisciplines } from '@/entities/session';
import { EmptyState, PlusIcon } from '@/shared/ui';

import { SessionCard } from './SessionCard';
import { groupSessionsByDateDesc, krDateHeader } from '../lib/calendar-grouping';

/**
 * CalendarAgendaView — 아젠다(날짜 내림차순 세션 리스트) (Design §8 "아젠다=날짜 내림차순" / F2-AC6).
 *
 * 표시 달(monthISO)의 세션을 날짜 DESC로 그룹핑해 헤더 + SessionCard로 나열한다(검색/복습 친화).
 * 비어 있으면 EmptyState. 제어 컴포넌트(상태 없음) — 세션 목록은 app이 props로 내린다.
 */

export interface CalendarAgendaViewProps {
  /** 표시 중인 달 'YYYY-MM'(빈 상태 안내 문구용). */
  monthISO: string;
  /** 표시 달 범위의 세션들(app이 fetchRangeSessions로 로드). */
  sessions: SessionWithDisciplines[];
}

export function CalendarAgendaView({ monthISO, sessions }: CalendarAgendaViewProps) {
  const groups = groupSessionsByDateDesc(sessions);
  const monthLabel = dayjs(`${monthISO}-01`).format('M월');

  if (groups.length === 0) {
    return (
      <EmptyState
        className="rounded-m border border-dashed border-[var(--border-default)] bg-[var(--surface-base)]"
        icon={<PlusIcon width={32} height={32} />}
        title={`${monthLabel}의 기록이 없습니다`}
        description="이 달에 기록한 세션이 여기에 날짜순으로 모여요."
      />
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        // 날짜 그룹은 h2(페이지 h1 아래 콘텐츠 섹션)로 헤딩 위계를 잇는다. region 랜드마크는 쓰지 않음.
        <div key={group.dateISO}>
          <h2 className="mb-2 text-heading-xs text-[var(--text-strong)]">{krDateHeader(group.dateISO)}</h2>
          <div className="space-y-3">
            {group.sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
