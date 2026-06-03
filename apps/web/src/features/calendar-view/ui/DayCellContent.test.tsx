// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { DayCellContent } from './DayCellContent';
import type { CalendarDaySummary } from '@/entities/session';

function summary(session_count: number, disciplines: CalendarDaySummary['disciplines'] = []): CalendarDaySummary {
  return { trained_on: '2026-06-10', session_count, disciplines, has_media: false };
}

describe('DayCellContent — 인-타일 빠른추가', () => {
  it('빈 날 + 핸들러 + 이번 달 → 빠른추가 + 렌더', () => {
    const { container } = render(
      <DayCellContent summary={undefined} date={new Date('2026-06-10')} onQuickAdd={() => {}} isNeighboringMonth={false} />,
    );
    expect(container.querySelector('.cal-quick-add')).not.toBeNull();
  });

  it('이웃 달이면 + 미렌더', () => {
    const { container } = render(
      <DayCellContent summary={undefined} date={new Date('2026-06-10')} onQuickAdd={() => {}} isNeighboringMonth />,
    );
    expect(container.querySelector('.cal-quick-add')).toBeNull();
  });

  it('onQuickAdd 없으면 + 미렌더(읽기 전용)', () => {
    const { container } = render(<DayCellContent summary={undefined} date={new Date('2026-06-10')} />);
    expect(container.querySelector('.cal-quick-add')).toBeNull();
  });

  it('+ 클릭 → onQuickAdd(date) 1회 호출 & 부모 클릭은 미발화(stopPropagation)', () => {
    const onQuickAdd = vi.fn();
    const parentClick = vi.fn();
    const d = new Date('2026-06-10');
    const { container } = render(
      <div onClick={parentClick}>
        <DayCellContent summary={undefined} date={d} onQuickAdd={onQuickAdd} isNeighboringMonth={false} />
      </div>,
    );
    fireEvent.click(container.querySelector('.cal-quick-add')!);
    expect(onQuickAdd).toHaveBeenCalledTimes(1);
    expect(onQuickAdd).toHaveBeenCalledWith(d);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('기록 있는 날 → 종목 점 + 세션 수, + 미렌더', () => {
    const { container } = render(
      <DayCellContent
        summary={summary(2, ['bjj_gi', 'mma'])}
        date={new Date('2026-06-10')}
        onQuickAdd={() => {}}
        isNeighboringMonth={false}
      />,
    );
    expect(screen.getByText('2')).toBeInTheDocument(); // 세션 수
    expect(screen.getAllByRole('img')).toHaveLength(2); // 종목 점 2개
    expect(container.querySelector('.cal-quick-add')).toBeNull();
  });
});
