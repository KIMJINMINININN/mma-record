// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

/**
 * GymShareToggle — 미소속 미노출 / 미공유→범위 선택 펼침 / 공유중→해제.
 * useQuery를 queryKey 분기 canned 목으로(queryFn 미실행 — calendar-screen.test 관용구).
 */
const M = vi.hoisted(() => ({
  gym: null as unknown,
  shared: [] as Array<{ resource_id: string; visibility: string; recipient_ids: string[] }>,
}));

vi.mock('@/shared/api/supabase/env', () => ({ isAuthEnabled: () => true }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/shared/api/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({ rpc: vi.fn().mockResolvedValue({ error: null }) }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey, enabled = true }: { queryKey: readonly unknown[]; enabled?: boolean }) => {
    if (!enabled) return { data: undefined };
    if (queryKey[1] === 'mine') return { data: M.gym };
    if (queryKey[1] === 'shares') return { data: M.shared };
    return { data: undefined };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import { GymShareToggle } from './GymShareToggle';

const RID = '11111111-1111-4111-8111-111111111111';
const GYM = {
  id: 'g1',
  name: 'X',
  is_owner: true,
  invite_code: null,
  created_at: '',
  members: [
    { user_id: 'me', name: '나', role: 'owner', is_me: true },
    { user_id: 'u2', name: '이코치', role: 'coach', is_me: false },
    { user_id: 'u3', name: '박관원', role: 'member', is_me: false },
  ],
};

beforeEach(() => {
  M.gym = null;
  M.shared = [];
});
afterEach(cleanup);

describe('GymShareToggle', () => {
  it('미소속 → 렌더하지 않음', () => {
    M.gym = null;
    const { container } = render(<GymShareToggle resourceType="session" resourceId={RID} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('소속 + 미공유 → "체육관에 공유" 펼치기 버튼', () => {
    M.gym = GYM;
    M.shared = [];
    render(<GymShareToggle resourceType="session" resourceId={RID} />);
    expect(screen.getByRole('button', { name: /체육관에 공유/ })).toBeInTheDocument();
  });

  it('소속 + 공유됨 → "공유중 · 범위" + 해제', () => {
    M.gym = GYM;
    M.shared = [{ resource_id: RID, visibility: 'everyone', recipient_ids: [] }];
    render(<GymShareToggle resourceType="session" resourceId={RID} />);
    // 현재 범위 라벨이 버튼에 표시(체육관 전원).
    const btn = screen.getByRole('button', { name: /공유중.*체육관 전원/ });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '해제' })).toBeInTheDocument();
  });

  it('공유중 "범위 변경" 클릭 → 현재 범위로 프리필된 패널(변경하기 버튼)', () => {
    M.gym = GYM;
    M.shared = [{ resource_id: RID, visibility: 'owner', recipient_ids: [] }];
    render(<GymShareToggle resourceType="session" resourceId={RID} />);
    fireEvent.click(screen.getByRole('button', { name: /공유중/ }));
    // 현재 범위(관장만)가 선택된 상태로 펼쳐짐.
    expect(screen.getByRole('radio', { name: '관장만' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: '변경하기' })).toBeInTheDocument();
  });

  it('미공유 클릭 → 범위 4종 라디오 펼침', () => {
    M.gym = GYM;
    render(<GymShareToggle resourceType="session" resourceId={RID} />);
    fireEvent.click(screen.getByRole('button', { name: /체육관에 공유/ }));
    expect(screen.getByRole('radio', { name: '관장·코치' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '체육관 전원' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '관장만' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '특정 멤버' })).toBeInTheDocument();
    // 기본 선택 = 관장·코치.
    expect(screen.getByRole('radio', { name: '관장·코치' })).toHaveAttribute('aria-checked', 'true');
  });

  it('특정 멤버 선택 → 나를 뺀 멤버 체크박스 노출', () => {
    M.gym = GYM;
    render(<GymShareToggle resourceType="session" resourceId={RID} />);
    fireEvent.click(screen.getByRole('button', { name: /체육관에 공유/ }));
    fireEvent.click(screen.getByRole('radio', { name: '특정 멤버' }));
    // 본인('나')은 제외, 다른 멤버만.
    expect(screen.getByText('이코치')).toBeInTheDocument();
    expect(screen.getByText('박관원')).toBeInTheDocument();
    expect(screen.queryByText('나')).toBeNull();
    // 아무도 안 고르면 공유 비활성.
    expect(screen.getByRole('button', { name: '공유하기' })).toBeDisabled();
  });
});
