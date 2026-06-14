// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * JoinView — 초대 링크 착지의 CTA 분기 검증 (초대 퍼널 ②).
 * react-query는 useQuery 직접 mock(호이스팅 모노레포 관용구). queryKey[1]로 preview/viewer 분기.
 *   1) 무효 코드 → 안내.   2) 미로그인 → 로그인 링크(?next=/join/<code>).
 *   3) 로그인+미소속 → "가입 요청".   4) 이미 소속 → 소속 안내.   5) 대기 → 대기 안내.
 *   6) 앱 밖 → "앱에서 보기" 배너 / 앱 안 → 배너 없음.
 */
const m = vi.hoisted(() => ({
  preview: null as unknown,
  viewer: null as unknown,
}));

vi.mock('@/shared/api/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    rpc: vi.fn().mockResolvedValue({ error: null }),
  }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/entities/gym', () => ({
  fetchGymByInviteCode: vi.fn(),
  fetchMyGym: vi.fn(),
  getMyPendingRequest: vi.fn(),
}));
// next/link 는 next 번들의 중첩 react를 끌어와 hoisted 모노레포에서 깨진다 → <a> 스텁.
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ href, children }: { href: string; children?: import('react').ReactNode }) =>
      createElement('a', { href }, children),
  };
});
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[1] === 'preview') return { data: m.preview, isLoading: false, isError: false };
    if (queryKey[1] === 'join-viewer') return { data: m.viewer, isLoading: false };
    return { data: undefined, isLoading: false };
  },
}));

import { JoinView } from './join-view';

const VALID_PREVIEW = { name: '스파르타 짐', member_count: 7 };

beforeEach(() => {
  m.preview = VALID_PREVIEW;
  m.viewer = { userId: null, gym: null, pending: null };
  // 기본은 앱 밖(브라우저) — 배너 노출.
  delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
});
afterEach(cleanup);

describe('JoinView', () => {
  it('무효 코드 → 안내', () => {
    m.preview = null;
    render(<JoinView code="BADCODE" />);
    expect(screen.getByText('유효하지 않은 초대 링크예요')).toBeTruthy();
  });

  it('유효 코드 → 체육관명·인원 표시', () => {
    render(<JoinView code="ABC123" />);
    expect(screen.getByText('스파르타 짐')).toBeTruthy();
    expect(screen.getByText('멤버 7명')).toBeTruthy();
  });

  it('미로그인 → 로그인 링크(?next=/join/<code>)', () => {
    m.viewer = { userId: null, gym: null, pending: null };
    render(<JoinView code="ABC123" />);
    const link = screen.getByText('로그인하고 참여하기').closest('a');
    expect(link?.getAttribute('href')).toBe('/login?next=%2Fjoin%2FABC123');
  });

  it('로그인 + 미소속 → "가입 요청" 버튼', () => {
    m.viewer = { userId: 'u1', gym: null, pending: null };
    render(<JoinView code="ABC123" />);
    expect(screen.getByRole('button', { name: '가입 요청' })).toBeTruthy();
  });

  it('이미 소속 → 소속 안내(가입 요청 버튼 없음)', () => {
    // 안내 문구의 "다른 체육관에 가입하려면…"과 겹치지 않는 이름을 쓴다(복수 매칭 회피).
    m.viewer = { userId: 'u1', gym: { name: '라이온짐' }, pending: null };
    render(<JoinView code="ABC123" />);
    expect(screen.getByText('라이온짐')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '가입 요청' })).toBeNull();
  });

  it('대기 중 → 승인 대기 안내', () => {
    m.viewer = { userId: 'u1', gym: null, pending: { name: '스파르타 짐' } };
    render(<JoinView code="ABC123" />);
    expect(screen.getByText(/관장님이 승인하면/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: '가입 요청' })).toBeNull();
  });

  it('앱 밖(브라우저) → "앱에서 보기" 배너 노출', () => {
    render(<JoinView code="ABC123" />);
    const banner = screen.getByText('앱에서 보기').closest('a');
    expect(banner?.getAttribute('href')).toBe('rnappdev://join/ABC123');
  });

  it('앱 안(WebView) → 배너 미노출', () => {
    (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView = {
      postMessage: vi.fn(),
    };
    render(<JoinView code="ABC123" />);
    expect(screen.queryByText('앱에서 보기')).toBeNull();
  });
});
