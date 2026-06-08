// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * ShareComments — 공유 페이지 코멘트 섹션(0025_comments.sql)의 읽기/쓰기 분기를 검증.
 *
 * share-view.test 와 동일 관용구: hoisted 모노레포의 중첩 react 충돌을 피하려 @tanstack/react-query 를
 * mock 하되, useQuery 는 **실제 queryFn 을 microtask 로 실행**하는 얇은 구현으로 둔다 → useComments/
 * useViewerId 의 rpc/getUser 호출과 널 내로잉을 진짜로 거친다. useQueryClient 는 no-op(invalidate 스텁).
 * Supabase 클라(rpc=get_shared_comments, auth.getUser=뷰어)와 sonner 토스트만 mock. queryFn 이 microtask
 * 로 resolve 하므로 findBy*(async)로 단언한다.
 */
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/shared/api/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({ rpc: m.rpc, auth: { getUser: m.getUser } }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// next/link 는 next 번들의 중첩 react(useContext)를 끌어와 hoisted 모노레포에서 깨진다 → <a> 스텁.
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ href, children }: { href: string; children?: import('react').ReactNode }) =>
      createElement('a', { href }, children),
  };
});
// 실제 queryFn 을 microtask 로 돌리는 얇은 useQuery + no-op useQueryClient(invalidate 스텁).
vi.mock('@tanstack/react-query', async () => {
  const { useState, useEffect } = await import('react');
  return {
    useQuery: <T,>({ queryFn }: { queryFn: () => Promise<T> }) => {
      const [state, setState] = useState<{
        data: T | undefined;
        isLoading: boolean;
        isError: boolean;
      }>({ data: undefined, isLoading: true, isError: false });
      useEffect(() => {
        let active = true;
        queryFn()
          .then((data) => active && setState({ data, isLoading: false, isError: false }))
          .catch(() => active && setState({ data: undefined, isLoading: false, isError: true }));
        return () => {
          active = false;
        };
        // queryFn 은 렌더마다 새 클로저 — 1회 실행 의도라 의존성 비움(테스트 한정 단순화).
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return state;
    },
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

import { ShareComments } from './share-comments';

/** 뷰어 쿼리(auth.getUser)와 코멘트 쿼리(rpc)를 한 번에 세팅하는 헬퍼. */
function mockViewer(userId: string | null) {
  m.getUser.mockResolvedValue({ data: { user: userId ? { id: userId } : null } });
}
function mockComments(comments: unknown[]) {
  m.rpc.mockResolvedValue({ data: comments, error: null });
}

beforeEach(() => {
  m.rpc.mockReset();
  m.getUser.mockReset();
});

afterEach(cleanup);

describe('ShareComments', () => {
  it('익명 + 코멘트 1개 → 작성자/본문 + 로그인 링크 노출, textarea 없음', async () => {
    mockViewer(null);
    mockComments([
      {
        id: 'c1',
        author_name: '김선수',
        body: '좋은 기록이네요',
        created_at: '2026-06-01T09:30:00Z',
        can_delete: false,
      },
    ]);

    render(<ShareComments token="tok" />);

    expect(await screen.findByText('김선수')).toBeInTheDocument();
    expect(await screen.findByText('좋은 기록이네요')).toBeInTheDocument();
    // 익명 → 로그인 유도 링크가 보이고 작성 textarea 는 없다.
    expect(await screen.findByText('로그인하고 코멘트 남기기')).toBeInTheDocument();
    expect(screen.queryByLabelText('코멘트 남기기')).toBeNull();
  });

  it('로그인 + 삭제 가능 코멘트 → textarea(작성) + × 삭제 버튼 노출', async () => {
    mockViewer('user-1');
    mockComments([
      {
        id: 'c1',
        author_name: '나',
        body: '내 코멘트',
        created_at: '2026-06-02T01:00:00Z',
        can_delete: true,
      },
    ]);

    render(<ShareComments token="tok" />);

    // 로그인 → 작성 textarea(label='코멘트 남기기') 가 렌더된다.
    expect(await screen.findByLabelText('코멘트 남기기')).toBeInTheDocument();
    // can_delete=true → × 삭제 버튼(aria-label='코멘트 삭제').
    expect(await screen.findByLabelText('코멘트 삭제')).toBeInTheDocument();
  });

  it('빈 목록 + 익명 → "아직 코멘트가 없어요" + 로그인 링크', async () => {
    mockViewer(null);
    mockComments([]);

    render(<ShareComments token="tok" />);

    expect(await screen.findByText('아직 코멘트가 없어요')).toBeInTheDocument();
    expect(await screen.findByText('로그인하고 코멘트 남기기')).toBeInTheDocument();
  });
});
