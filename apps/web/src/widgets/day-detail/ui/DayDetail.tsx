import dayjs from 'dayjs';

import type { SessionWithDisciplines } from '@/entities/session';
import { EmptyState, PlusIcon } from '@/shared/ui';

import { SessionCard } from './SessionCard';
import { AddSessionButton } from './AddSessionButton';

/**
 * DayDetail — 선택 날짜의 세션 목록 (Design §7b / F2-AC3).
 *
 * 헤더: "5월 22일 (목)" + `+ 세션 추가` 버튼(스텁).
 * 본문: SessionCard 리스트. 비어 있으면 EmptyState("이 날의 첫 세션을 기록하세요").
 *
 * 표시 전용 + 한 개의 액션 버튼(현재 스텁) → 서버 컴포넌트로 둔다.
 * (날짜 상태/선택은 app 레벨 클라이언트 아일랜드가 소유 → 여기엔 props로 내려옴)
 */

/** dayjs 기본 로케일이 영어라 한글 요일은 직접 매핑(추가 로케일 의존 회피). */
const KR_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export interface DayDetailProps {
  /** 헤더에 표시할 선택 날짜. */
  selectedDate: Date;
  /** 선택 날짜의 세션 목록. 빈 배열이면 EmptyState. */
  sessions: SessionWithDisciplines[];
}

export function DayDetail({ selectedDate, sessions }: DayDetailProps) {
  const d = dayjs(selectedDate);
  // "5월 22일 (목)" — 월/일은 dayjs, 요일은 KR_WEEKDAYS 매핑.
  const dateLabel = `${d.month() + 1}월 ${d.date()}일 (${KR_WEEKDAYS[d.day()]})`;

  return (
    <section aria-label={`${dateLabel} 세션`} className="flex flex-col">
      {/* 헤더 — 날짜 + 추가 */}
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-heading-s text-[var(--text-strong)]">{dateLabel}</h2>
        {/* 세션 에디터(바텀시트/모달) 오픈 — 선택 날짜 프리셋(F3). */}
        <AddSessionButton date={selectedDate} variant="secondary" size="sm" />
      </header>

      {/* 본문 — 세션 카드 리스트 or 빈 상태 */}
      {sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="rounded-m border border-dashed border-[var(--border-default)] bg-[var(--surface-base)]"
          icon={<PlusIcon width={32} height={32} />}
          title="이 날의 첫 세션을 기록하세요"
          description="훈련한 종목과 기술을 남기면 캘린더에 점과 세션 수로 표시됩니다."
          action={<AddSessionButton date={selectedDate} variant="primary" size="md" />}
        />
      )}
    </section>
  );
}
