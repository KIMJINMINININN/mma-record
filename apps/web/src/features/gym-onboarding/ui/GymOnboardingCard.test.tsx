// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

/**
 * GymOnboardingCard — 캘린더 온보딩 안내의 4분기 검증 (체육관=선택 모델).
 * react-query는 useQuery 직접 mock(호이스팅 모노레포 — calendar-screen.test 관용구). queryKey[1]로 분기.
 *   1) 미소속 → 참여/만들기/나중에 노출.
 *   2) 소속됨 → null.
 *   3) 가입 대기 → "승인 대기 중"(닫혔어도 표시).
 *   4) 나중에 클릭 → localStorage 닫음 → 미소속이어도 숨김.
 */
const m = vi.hoisted(() => ({
  gym: null as unknown,
  pending: null as unknown,
}));

vi.mock('@/shared/api/supabase/env', () => ({ isAuthEnabled: () => true }));
vi.mock('@/shared/api/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({ rpc: vi.fn().mockResolvedValue({ error: null }) }),
}));
vi.mock('@/entities/gym', () => ({
  fetchMyGym: vi.fn(),
  getMyPendingRequest: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[1] === 'my') return { data: m.gym, isLoading: false };
    if (queryKey[1] === 'pending-request') return { data: m.pending };
    return { data: undefined };
  },
}));

import { GymOnboardingCard } from './GymOnboardingCard';

beforeEach(() => {
  m.gym = null;
  m.pending = null;
  localStorage.clear();
});
afterEach(cleanup);

describe('GymOnboardingCard', () => {
  it('미소속: 참여·만들기·나중에 노출', () => {
    render(<GymOnboardingCard />);
    expect(screen.getByText('체육관과 함께 쓰면 더 좋아요')).toBeTruthy();
    expect(screen.getByLabelText('초대코드로 참여')).toBeTruthy();
    expect(screen.getByLabelText('또는 체육관 만들기')).toBeTruthy();
    expect(screen.getByText('나중에')).toBeTruthy();
  });

  it('이미 소속: 렌더 안 함(null)', () => {
    m.gym = { id: 'g1', name: 'QA 체육관', is_owner: true };
    const { container } = render(<GymOnboardingCard />);
    expect(container.firstChild).toBeNull();
  });

  it('가입 승인 대기: 대기 안내 + 취소', () => {
    m.pending = { gym_name: 'QA 체육관' };
    render(<GymOnboardingCard />);
    expect(screen.getByText(/승인 대기 중/)).toBeTruthy();
    expect(screen.getByText('요청 취소')).toBeTruthy();
  });

  it('나중에 클릭 → localStorage 닫음 → 미소속이어도 숨김', () => {
    const { container, rerender } = render(<GymOnboardingCard />);
    fireEvent.click(screen.getByText('나중에'));
    expect(localStorage.getItem('matlog.gym-onboarding-dismissed')).toBe('1');
    rerender(<GymOnboardingCard />);
    expect(container.firstChild).toBeNull();
  });

  it('닫았어도 가입 대기 중이면 대기 안내는 표시', () => {
    localStorage.setItem('matlog.gym-onboarding-dismissed', '1');
    m.pending = { gym_name: 'QA 체육관' };
    render(<GymOnboardingCard />);
    expect(screen.getByText(/승인 대기 중/)).toBeTruthy();
  });
});
