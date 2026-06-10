// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * GymFeed — 관장 피드 목록 렌더 / 빈 상태. useQuery queryKey 분기 canned 목.
 */
const M = vi.hoisted(() => ({ gym: null as unknown, feed: [] as unknown[] }));

vi.mock('@/shared/api/supabase/env', () => ({ isAuthEnabled: () => true }));
// next/link 는 next 번들의 중첩 react(useContext)를 끌어와 hoisted 모노레포에서 깨진다 → <a> 스텁.
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ href, children }: { href: string; children?: import('react').ReactNode }) =>
      createElement('a', { href }, children),
  };
});
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey, enabled = true }: { queryKey: readonly unknown[]; enabled?: boolean }) => {
    if (!enabled) return { data: undefined };
    if (queryKey[1] === 'mine') return { data: M.gym };
    if (queryKey[1] === 'feed') return { data: M.feed };
    return { data: undefined };
  },
}));

import { GymFeed } from './GymFeed';

const GYM = { id: 'g1', name: '관장님 체육관', is_owner: true, is_staff: true, invite_code: 'X', created_at: '', members: [] };
const item = (over: Record<string, unknown>) => ({
  id: 'f1',
  resource_type: 'session',
  resource_id: 'r1',
  member_name: '김선수',
  is_mine: false,
  shared_at: '2026-06-10T09:30:00+00:00',
  title: '2026-06-10',
  subtitle: '2026-06-10',
  missing: false,
  ...over,
});

beforeEach(() => {
  M.gym = null;
  M.feed = [];
});
afterEach(cleanup);

describe('GymFeed', () => {
  it('관장 + 공유 항목 → 제목·공유자 렌더', () => {
    M.gym = GYM;
    M.feed = [
      item({ id: 'f1', resource_type: 'technique', title: '니 슬라이스 패스', member_name: '김선수' }),
      item({ id: 'f2', resource_type: 'session', title: '2026-06-09', member_name: '박선수' }),
    ];
    render(<GymFeed />);
    expect(screen.getByRole('heading', { name: /피드/ })).toBeInTheDocument();
    expect(screen.getByText('니 슬라이스 패스')).toBeInTheDocument();
    expect(screen.getByText(/김선수/)).toBeInTheDocument();
  });

  it('빈 피드 → 안내', () => {
    M.gym = GYM;
    M.feed = [];
    render(<GymFeed />);
    expect(screen.getByText('아직 공유된 기록이 없어요')).toBeInTheDocument();
  });
});
