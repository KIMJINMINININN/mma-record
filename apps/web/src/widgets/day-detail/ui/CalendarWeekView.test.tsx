// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// AddSessionButton(각 날짜)이 zustand 스토어 훅을 쓰는데, hoisted 모노레포에서 zustand 내부
// react 인스턴스가 갈려 "Invalid hook call"이 난다(AddSessionButton.test와 동일 회피). → 스토어 mock.
const openMock = vi.fn();
vi.mock('@/shared/model/session-editor-store', () => ({
  useSessionEditorStore: (selector: (s: { open: typeof openMock }) => unknown) =>
    selector({ open: openMock }),
}));

import { CalendarWeekView } from './CalendarWeekView';
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

describe('CalendarWeekView', () => {
  it('7개 날짜 블록(h2 헤딩) + 각 날짜 추가 버튼', () => {
    render(<CalendarWeekView weekStartISO="2026-05-31" sessionsByDate={{}} />);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(7);
    expect(screen.getAllByRole('button', { name: /추가/ })).toHaveLength(7);
  });

  it('세션 있는 날은 SessionCard, 없는 날은 "기록 없음"', () => {
    render(
      <CalendarWeekView
        weekStartISO="2026-05-31"
        sessionsByDate={{ '2026-06-03': [session('s1', '2026-06-03')] }}
      />,
    );
    expect(screen.getAllByRole('article')).toHaveLength(1); // SessionCard
    expect(screen.getAllByText('기록 없음')).toHaveLength(6); // 7일 - 1일
  });
});
