// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// 날짜별 AddSessionButton이 zustand 스토어 훅을 쓰므로 hoisted 모노레포에서 mock(공통 패턴).
const openMock = vi.fn();
vi.mock('@/shared/model/session-editor-store', () => ({
  useSessionEditorStore: (selector: (s: { open: typeof openMock }) => unknown) =>
    selector({ open: openMock }),
}));

// SessionCard 가 SessionFavoriteStar(클라 아일랜드: useQueryClient + 'use server' 액션 체인)를 렌더하므로
// 이 표시 테스트에서는 별표를 스텁(react-query provider/서버 import 없이 렌더, 공통 mock 패턴).
vi.mock('@/features/session-favorite', () => ({
  SessionFavoriteStar: () => null,
}));

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
    is_favorite: false,
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
    // 날짜 그룹마다 추가 버튼(주 뷰 패리티) — 그룹 2개
    expect(screen.getAllByRole('button', { name: /추가/ })).toHaveLength(2);
  });
});
