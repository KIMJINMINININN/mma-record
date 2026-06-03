// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DisciplineBars } from './DisciplineBars';
import { DISCIPLINES, type Discipline } from '@/shared/model/enums';

function dist(partial: Partial<Record<Discipline, number>>): Record<Discipline, number> {
  const base = Object.fromEntries(DISCIPLINES.map((d) => [d, 0])) as Record<Discipline, number>;
  return { ...base, ...partial };
}

describe('DisciplineBars', () => {
  it('전 종목 행 렌더(enum-exhaustive) + 출현 합계', () => {
    render(<DisciplineBars distribution={dist({ bjj_gi: 3, bjj_nogi: 1, mma: 2 })} />);
    // 종목 칩은 각 행마다 role=img(aria-label=종목명) → 5개
    expect(screen.getAllByRole('img')).toHaveLength(DISCIPLINES.length);
    expect(screen.getByText('종목 출현 합계 6회 (2종목 세션은 각각 집계)')).toBeInTheDocument();
  });

  it('비율 표기(3/6 = 50%)', () => {
    render(<DisciplineBars distribution={dist({ bjj_gi: 3, bjj_nogi: 1, mma: 2 })} />);
    expect(screen.getByText('3회 · 50%')).toBeInTheDocument();
    expect(screen.getByText('2회 · 33%')).toBeInTheDocument();
  });

  it('데이터 0 → 종목 정보 없음', () => {
    render(<DisciplineBars distribution={dist({})} />);
    expect(screen.getByText('종목 정보 없음')).toBeInTheDocument();
    expect(screen.getByText('종목 출현 합계 0회 (2종목 세션은 각각 집계)')).toBeInTheDocument();
  });
});
