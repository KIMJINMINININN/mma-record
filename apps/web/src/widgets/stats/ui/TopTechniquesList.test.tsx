// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TopTechniquesList } from './TopTechniquesList';
import type { TopTechnique } from '@/entities/session';

function items(n: number): TopTechnique[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    name: `기술${i}`,
    discipline: 'bjj_gi' as const,
    count: n - i,
  }));
}

describe('TopTechniquesList', () => {
  it('기본 5행 + 더 보기 버튼(7개일 때)', () => {
    render(<TopTechniquesList items={items(7)} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('button', { name: '더 보기' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('더 보기 클릭 → 최대 10행까지 확장(7개→7행)', async () => {
    const user = userEvent.setup();
    render(<TopTechniquesList items={items(7)} />);
    await user.click(screen.getByRole('button', { name: '더 보기' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByRole('button', { name: '접기' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('5개 이하면 더 보기 버튼 없음', () => {
    render(<TopTechniquesList items={items(4)} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('빈 입력 → 안내 문구, 리스트 없음', () => {
    render(<TopTechniquesList items={[]} />);
    expect(screen.getByText('아직 복습한 기술이 없어요.')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
