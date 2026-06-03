// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CalendarAgendaView } from './CalendarAgendaView';
import type { SessionWithDisciplines } from '@/entities/session';

function session(id: string, trained_on: string): SessionWithDisciplines {
  return {
    id,
    user_id: 'u',
    trained_on,
    gym: null,
    class_type: null,
    duration_min: null,
    intensity: null,
    rounds: null,
    partners: null,
    memo_md: null,
    rating: null,
    visibility: 'private',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    disciplines: [],
    tags: [],
    techniques: [],
    media: [],
  };
}

describe('CalendarAgendaView', () => {
  it('빈 세션 → 달 라벨 EmptyState', () => {
    render(<CalendarAgendaView monthISO="2026-06" sessions={[]} />);
    expect(screen.getByText('6월의 기록이 없습니다')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('세션 → 날짜 내림차순 그룹 + SessionCard 개수 = 입력 수', () => {
    render(
      <CalendarAgendaView
        monthISO="2026-06"
        sessions={[
          session('a', '2026-06-01'),
          session('b', '2026-06-10'),
          session('c', '2026-06-10'),
        ]}
      />,
    );
    expect(screen.getAllByRole('article')).toHaveLength(3);
    // 날짜 헤더(h2) — 최신(6월 10일)이 먼저
    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings[0]).toHaveTextContent('6월 10일');
    expect(headings[1]).toHaveTextContent('6월 1일');
  });
});
