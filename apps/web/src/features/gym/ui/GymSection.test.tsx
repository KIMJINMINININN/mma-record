// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * GymSection 섬 테스트 — 미소속/관장/관원 3분기 렌더.
 * 패턴: supabase 클라(rpc) 목 + sonner 목 + thin useQuery(queryFn 실행) 목(share-comments 관용구).
 * thin useQuery가 실제 fetchMyGym을 돌리므로 목 rpc 데이터는 myGymSchema를 만족해야 한다(유효 UUID/offset 타임스탬프).
 */

const m = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/shared/api/supabase/env', () => ({ isAuthEnabled: () => true }));
vi.mock('@/shared/api/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({ rpc: m.rpc }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@tanstack/react-query', async () => {
  const { useState, useEffect } = await import('react');
  return {
    useQuery: <T,>({
      queryFn,
      enabled = true,
    }: {
      queryFn: () => Promise<T>;
      enabled?: boolean;
    }) => {
      const [state, setState] = useState<{ data: T | undefined; isLoading: boolean }>({
        data: undefined,
        isLoading: true,
      });
      useEffect(() => {
        if (!enabled) {
          setState({ data: undefined, isLoading: false });
          return;
        }
        let active = true;
        queryFn()
          .then((data) => active && setState({ data, isLoading: false }))
          .catch(() => active && setState({ data: undefined, isLoading: false }));
        return () => {
          active = false;
        };
      }, [enabled]);
      return state;
    },
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

import { GymSection } from './GymSection';

function rpcReturnsMyGym(value: unknown) {
  m.rpc.mockImplementation((fn: string) => {
    if (fn === 'get_my_gym') return Promise.resolve({ data: value, error: null });
    return Promise.resolve({ data: null, error: null });
  });
}

const TS = '2026-06-10T09:30:00+00:00';
const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MEMBER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ME = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const ownerGym = {
  id: '11111111-1111-4111-8111-111111111111',
  name: '관장님 체육관',
  owner_id: OWNER,
  is_owner: true,
  invite_code: 'A3F9C2D1',
  created_at: TS,
  members: [
    { user_id: OWNER, name: '관장', role: 'owner', joined_at: TS, is_me: true },
    { user_id: MEMBER, name: '김선수', role: 'member', joined_at: TS, is_me: false },
  ],
};

const memberGym = {
  id: '11111111-1111-4111-8111-111111111111',
  name: '관장님 체육관',
  owner_id: OWNER,
  is_owner: false,
  invite_code: null,
  created_at: TS,
  members: [
    { user_id: OWNER, name: '관장', role: 'owner', joined_at: TS, is_me: false },
    { user_id: ME, name: '나', role: 'member', joined_at: TS, is_me: true },
  ],
};

beforeEach(() => {
  m.rpc.mockReset();
});
afterEach(cleanup);

describe('GymSection', () => {
  it('미소속 → 생성·가입 폼', async () => {
    rpcReturnsMyGym(null);
    render(<GymSection />);
    expect(await screen.findByRole('button', { name: '체육관 만들기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '가입하기' })).toBeInTheDocument();
  });

  it('관장 → 초대코드·명단·삭제·내보내기', async () => {
    rpcReturnsMyGym(ownerGym);
    render(<GymSection />);
    expect(await screen.findByText('관장님 체육관')).toBeInTheDocument();
    expect(screen.getByText('A3F9C2D1')).toBeInTheDocument();
    expect(screen.getByText('김선수')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '체육관 삭제' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '내보내기' })).toBeInTheDocument();
  });

  it('관원 → 탈퇴 / 초대코드·내보내기 없음', async () => {
    rpcReturnsMyGym(memberGym);
    render(<GymSection />);
    expect(await screen.findByText('관장님 체육관')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '탈퇴' })).toBeInTheDocument();
    expect(screen.queryByText('초대코드')).toBeNull();
    expect(screen.queryByRole('button', { name: '내보내기' })).toBeNull();
  });
});
