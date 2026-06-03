// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * 쿼리/액션/토스트/인증을 mock. @tanstack/react-query는 hoisted 모노레포에서 중첩 react 인스턴스를
 * 끌어와 "Invalid hook call"이 나므로(zustand 동일) useQuery/useQueryClient를 직접 mock해 우회한다.
 * TagChip·팔레트 메타·sortTags는 실제(엔티티 partial mock).
 */
const m = vi.hoisted(() => {
  const row = (id: string, name: string, color: string | null) => ({
    id,
    user_id: 'u',
    name,
    color,
    created_at: '2026-01-01T00:00:00.000Z',
  });
  return {
    isAuthEnabled: vi.fn(() => true),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    invalidateQueries: vi.fn(),
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
    tags: [row('a', '가드', null), row('b', '암바', 'teal')],
    counts: new Map([
      ['a', 5],
      ['b', 2],
    ]),
  };
});

vi.mock('@/shared/api/supabase/env', () => ({ isAuthEnabled: m.isAuthEnabled }));
vi.mock('sonner', () => ({ toast: m.toast }));
vi.mock('../api/tag-actions', () => ({ updateTag: m.updateTag, deleteTag: m.deleteTag }));
vi.mock('@/entities/tag', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/tag')>();
  return { ...actual, fetchTags: vi.fn(), fetchTagUsageCounts: vi.fn() };
});
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey, enabled }: { queryKey: unknown[]; enabled: boolean }) => {
    if (!enabled) return { data: undefined, isPending: true };
    if (queryKey[1] === 'manage') return { data: m.tags, isPending: false };
    if (queryKey[1] === 'usage') return { data: m.counts, isPending: false };
    return { data: undefined, isPending: false };
  },
  useQueryClient: () => ({ invalidateQueries: m.invalidateQueries }),
}));

import { TagManager } from './TagManager';

beforeEach(() => {
  m.isAuthEnabled.mockReturnValue(true);
  m.updateTag.mockResolvedValue({ ok: true });
  m.deleteTag.mockResolvedValue({ ok: true });
  m.updateTag.mockClear();
  m.deleteTag.mockClear();
  m.toast.success.mockClear();
  m.toast.error.mockClear();
});

afterEach(cleanup);

describe('TagManager', () => {
  it('태그 행 + 사용 횟수, 빈도순 정렬', () => {
    render(<TagManager />);
    expect(screen.getByText('가드')).toBeInTheDocument();
    expect(screen.getByText('암바')).toBeInTheDocument();
    expect(screen.getByText('5회')).toBeInTheDocument();
    expect(screen.getByText('2회')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('가드'); // 5회 먼저
  });

  it('AUTH OFF → 휴면 EmptyState', () => {
    m.isAuthEnabled.mockReturnValue(false);
    render(<TagManager />);
    expect(screen.getByText('로그인 후 태그를 관리할 수 있어요')).toBeInTheDocument();
    expect(screen.queryByText('가드')).not.toBeInTheDocument();
  });

  it('이름 변경 → updateTag(id, {name}) + 성공 토스트', async () => {
    const user = userEvent.setup();
    render(<TagManager />);
    const firstRow = screen.getAllByRole('listitem')[0];
    await user.click(within(firstRow).getByRole('button', { name: '이름' }));
    const input = screen.getByLabelText('새 태그 이름');
    await user.clear(input);
    await user.type(input, '그랩');
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(m.updateTag).toHaveBeenCalledWith('a', { name: '그랩' }));
    expect(m.toast.success).toHaveBeenCalled();
  });

  it('색 스와치 클릭 → updateTag(id, {color})', async () => {
    const user = userEvent.setup();
    render(<TagManager />);
    const firstRow = screen.getAllByRole('listitem')[0];
    await user.click(within(firstRow).getByRole('button', { name: '색상' }));
    await user.click(within(firstRow).getByRole('button', { name: '청록' })); // teal swatch (aria-pressed 토글)
    await waitFor(() => expect(m.updateTag).toHaveBeenCalledWith('a', { color: 'teal' }));
  });

  it('삭제 확인 → deleteTag(id)', async () => {
    const user = userEvent.setup();
    render(<TagManager />);
    const firstRow = screen.getAllByRole('listitem')[0];
    await user.click(within(firstRow).getByRole('button', { name: '삭제' }));
    const deletes = within(firstRow).getAllByRole('button', { name: '삭제' });
    await user.click(deletes[deletes.length - 1]);
    await waitFor(() => expect(m.deleteTag).toHaveBeenCalledWith('a'));
  });
});
