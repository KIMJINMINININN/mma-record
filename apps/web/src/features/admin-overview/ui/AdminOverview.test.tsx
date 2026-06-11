// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * AdminOverview — 운영 현황 대시보드 아일랜드 (0037_admin_overview.sql).
 * react-query는 useQuery를 직접 mock한다(QueryClientProvider를 쓰면 호이스팅 모노레포에서 중첩 react로
 * null useEffect 크래시 — calendar-screen.test 관용구). isAuthEnabled도 mock.
 *   1) get_admin_overview 성공 데이터 → 카운트 카드 렌더(숫자·보조 텍스트).
 *   2) RPC 거부(error) → "접근 권한이 없습니다" 안내(집계 숫자 비노출).
 */
const m = vi.hoisted(() => ({ query: { data: undefined as unknown, isLoading: false, error: null as unknown } }));

vi.mock('@/shared/api/supabase/env', () => ({ isAuthEnabled: () => true }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => m.query,
}));
vi.mock('@/shared/api/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({ rpc: vi.fn() }),
}));

import { AdminOverview } from './AdminOverview';

const FULL = {
  members_total: 5,
  members_new_week: 2,
  sessions_total: 12,
  sessions_week: 3,
  techniques_total: 205,
  gyms_total: 1,
  gym_members_total: 2,
  shares_total: 4,
  comments_total: 4,
  active_devices: 4,
  generated_at: '2026-06-11T05:00:00Z',
};

beforeEach(() => {
  m.query = { data: undefined, isLoading: false, error: null };
});
afterEach(cleanup);

describe('AdminOverview', () => {
  it('운영자: 집계 카드 렌더(총 회원·이번 주 신규·프리셋 포함)', () => {
    m.query = { data: FULL, isLoading: false, error: null };
    render(<AdminOverview />);

    expect(screen.getByText('총 회원')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('이번 주 신규 +2')).toBeTruthy();
    expect(screen.getByText('205')).toBeTruthy();
    expect(screen.getByText('최근 7일 3회')).toBeTruthy();
  });

  it('비운영자: RPC 거부 → 권한 없음 안내(집계 숫자 비노출)', () => {
    m.query = { data: undefined, isLoading: false, error: { message: '권한이 없습니다' } };
    render(<AdminOverview />);

    expect(screen.getByText('접근 권한이 없습니다')).toBeTruthy();
    expect(screen.queryByText('총 회원')).toBeNull();
  });

  it('로딩 중 안내', () => {
    m.query = { data: undefined, isLoading: true, error: null };
    render(<AdminOverview />);
    expect(screen.getByText('불러오는 중…')).toBeTruthy();
  });
});
