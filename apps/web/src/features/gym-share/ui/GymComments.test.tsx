// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * GymComments — 코멘트 목록/빈 상태 + 작성 폼 렌더. useQuery canned 목(queryFn 미실행).
 */
const M = vi.hoisted(() => ({ comments: [] as unknown[] }));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: M.comments }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import { GymComments } from './GymComments';

const SID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  M.comments = [];
});
afterEach(cleanup);

describe('GymComments', () => {
  it('코멘트 있음 → 작성자·본문 + 작성 폼', () => {
    M.comments = [
      {
        id: 'c1',
        author_name: '관장',
        body: '스윕 타이밍 좋아요',
        created_at: '2026-06-10T09:30:00+00:00',
        can_delete: true,
      },
    ];
    render(<GymComments gymShareId={SID} />);
    expect(screen.getByText('관장')).toBeInTheDocument();
    expect(screen.getByText('스윕 타이밍 좋아요')).toBeInTheDocument();
    // 양방향 작성 폼 상시 노출(라우트가 인증가드)
    expect(screen.getByLabelText('코멘트 남기기')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '등록' })).toBeInTheDocument();
  });

  it('코멘트 없음 → 안내', () => {
    M.comments = [];
    render(<GymComments gymShareId={SID} />);
    expect(screen.getByText('아직 코멘트가 없어요')).toBeInTheDocument();
  });
});
