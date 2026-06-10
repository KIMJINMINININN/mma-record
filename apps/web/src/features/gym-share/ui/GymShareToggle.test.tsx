// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * GymShareToggle — 미소속 미노출 / 미공유·공유 상태 토글 렌더.
 * useQuery를 queryKey 분기 canned 목으로(queryFn 미실행 — calendar-screen.test 관용구).
 */
const M = vi.hoisted(() => ({ gym: null as unknown, shared: [] as string[] }));

vi.mock('@/shared/api/supabase/env', () => ({ isAuthEnabled: () => true }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
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
const GYM = { id: 'g1', name: 'X', is_owner: true, invite_code: null, created_at: '', members: [] };

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

  it('소속 + 미공유 → "체육관" 버튼(aria-pressed=false)', () => {
    M.gym = GYM;
    M.shared = [];
    render(<GymShareToggle resourceType="session" resourceId={RID} />);
    const btn = screen.getByRole('button', { name: /체육관/ });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('소속 + 공유됨 → "공유중"(aria-pressed=true)', () => {
    M.gym = GYM;
    M.shared = [RID];
    render(<GymShareToggle resourceType="session" resourceId={RID} />);
    const btn = screen.getByRole('button', { name: /공유중/ });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });
});
