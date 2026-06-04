// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * CalendarScreen — favorites viewMode 스크린레벨 테스트.
 *
 * B(즐겨찾기 cross-month 뷰)의 invariant 를 컴포넌트 레벨에서 고정한다: 즐겨찾기 탭 선택 시
 * (1) ['calendar','favorites'] 쿼리 data 가 AgendaView 로 흐르고, (2) 기간 네비/오늘로/'즐겨찾기만'
 * 토글이 숨겨지며, (3) 제목이 '즐겨찾기'가 된다. react-query/env/store 를 mock 하고(hoisted react
 * 회피), 무거운 자식(MonthGrid/DayDetail/WeekView/AgendaView)은 stub — weekRange/groupSessionsByDateMap
 * 순수 함수만 가벼운 mock 으로 대체(day-detail importOriginal 시 SessionFavoriteStar→server-only 회피).
 */
const m = vi.hoisted(() => ({
  isAuthEnabled: vi.fn(() => true),
  invalidateQueries: vi.fn(),
  openEditor: vi.fn(),
  favorites: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/shared/api/supabase/env', () => ({ isAuthEnabled: m.isAuthEnabled }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[1] === 'favorites') return { data: m.favorites };
    if (queryKey[1] === 'summaries') return { data: {} };
    return { data: [] };
  },
  useQueryClient: () => ({ invalidateQueries: m.invalidateQueries }),
}));
vi.mock('@/shared/model/session-editor-store', () => ({
  useSessionEditorStore: (selector: (s: { open: typeof m.openEditor }) => unknown) =>
    selector({ open: m.openEditor }),
}));
vi.mock('@/features/calendar-view', () => ({ CalendarMonthGrid: () => null }));
vi.mock('@/widgets/day-detail', async () => {
  const { createElement } = await import('react');
  return {
    DayDetail: () => null,
    CalendarWeekView: () => null,
    CalendarAgendaView: ({ sessions, emptyTitle }: { sessions: unknown[]; emptyTitle?: string }) =>
      createElement(
        'div',
        { 'data-testid': 'agenda', 'data-empty': emptyTitle ?? '' },
        `agenda:${sessions.length}`,
      ),
    groupSessionsByDateMap: () => new Map(),
    weekRange: () => ({ startISO: '2026-06-01', endISO: '2026-06-07' }),
  };
});

import { CalendarScreen } from './calendar-screen';

function fav(id: string) {
  return { id, is_favorite: true, disciplines: [], trained_on: '2026-05-01' };
}

beforeEach(() => {
  m.isAuthEnabled.mockReturnValue(true);
  m.invalidateQueries.mockClear();
  m.openEditor.mockClear();
  m.favorites = [];
});

afterEach(cleanup);

describe('CalendarScreen — favorites viewMode', () => {
  it('뷰탭 4개(월/주/아젠다/즐겨찾기)', () => {
    render(<CalendarScreen />);
    expect(screen.getByRole('tab', { name: '월' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '주' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '아젠다' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '즐겨찾기' })).toBeInTheDocument();
  });

  it('초기(월 뷰): 기간 네비 + 즐겨찾기만 토글 노출', () => {
    render(<CalendarScreen />);
    expect(screen.getByRole('button', { name: '이전 달' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '즐겨찾기만 보기' })).toBeInTheDocument();
  });

  it('즐겨찾기 탭 → AgendaView(favorites) 렌더 + 기간네비/즐겨찾기만 토글 숨김 + 제목 "즐겨찾기"', async () => {
    m.favorites = [fav('s1'), fav('s2')];
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('tab', { name: '즐겨찾기' }));
    // (1) favorites 쿼리 data 가 AgendaView 로 흐른다.
    expect(screen.getByTestId('agenda')).toHaveTextContent('agenda:2');
    // (2) 기간 네비/오늘로/즐겨찾기만 토글 숨김.
    expect(screen.queryByRole('button', { name: '이전 달' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '즐겨찾기만 보기' })).not.toBeInTheDocument();
    // (3) 제목 = '즐겨찾기'(h1).
    expect(screen.getByRole('heading', { name: '즐겨찾기' })).toBeInTheDocument();
  });

  it('즐겨찾기 빈 목록 → AgendaView 에 emptyTitle override 전달', async () => {
    m.favorites = [];
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(screen.getByRole('tab', { name: '즐겨찾기' }));
    expect(screen.getByTestId('agenda')).toHaveAttribute('data-empty', '즐겨찾기한 세션이 없습니다');
  });
});
