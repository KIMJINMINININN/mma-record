// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StreakDisplay } from './StreakDisplay';
import type { StreakDay } from '@/entities/session';

function days(spec: { trained: boolean; isToday?: boolean }[]): StreakDay[] {
  return spec.map((s, i) => ({
    dateISO: `2026-06-${String(i + 1).padStart(2, '0')}`,
    trained: s.trained,
    isToday: s.isToday ?? false,
  }));
}

describe('StreakDisplay', () => {
  it('현재/최장 수치 + 점 행 aria-label', () => {
    const d = days([{ trained: true }, { trained: true }, { trained: false, isToday: true }]);
    render(<StreakDisplay streak={{ current: 2, longest: 5 }} days={d} />);

    expect(screen.getByText('연속 기록')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('최장 5일')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '현재 연속 2일, 최근 3일 중 2일 기록, 오늘 미기록' }),
    ).toBeInTheDocument();
  });

  it('오늘 미기록 + current>0 → 유예 카피', () => {
    const d = days([{ trained: true }, { trained: false, isToday: true }]);
    render(<StreakDisplay streak={{ current: 1, longest: 1 }} days={d} />);
    expect(
      screen.getByText('어제까지 기록했어요 — 오늘 한 세션이면 이어집니다.'),
    ).toBeInTheDocument();
  });

  it('오늘 기록 → 이어가는 카피', () => {
    const d = days([{ trained: true }, { trained: true, isToday: true }]);
    render(<StreakDisplay streak={{ current: 2, longest: 2 }} days={d} />);
    expect(screen.getByText('오늘도 이어가고 있어요.')).toBeInTheDocument();
  });

  it('current 0 → 시작 권유 카피', () => {
    const d = days([{ trained: false }, { trained: false, isToday: true }]);
    render(<StreakDisplay streak={{ current: 0, longest: 3 }} days={d} />);
    expect(screen.getByText('오늘 기록하고 스트릭을 시작하세요.')).toBeInTheDocument();
  });
});
