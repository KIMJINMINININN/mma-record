// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FrequencyChart } from './FrequencyChart';
import type { FrequencyBucket } from '@/entities/session';

const weekly: FrequencyBucket[] = [
  { key: 'w1', label: '5/1', count: 0 },
  { key: 'w2', label: '5/8', count: 4 },
  { key: 'w3', label: '5/15', count: 2 },
];
const monthly: FrequencyBucket[] = [
  { key: '2026-05', label: '5월', count: 5 },
  { key: '2026-06', label: '6월', count: 3 },
];

describe('FrequencyChart', () => {
  it('초기엔 주간 radio 선택 + 목표선 + 달성 수 요약', () => {
    render(<FrequencyChart weekly={weekly} monthly={monthly} />);
    expect(screen.getByRole('radio', { name: '주간' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '월간' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('목표 주 3회')).toBeInTheDocument();
    // 주간 모드: count>=3 인 버킷(4회=w2) 1개 달성 → aria-live 요약에 반영
    expect(screen.getByText(/목표 주 3회 달성 1주/)).toBeInTheDocument();
  });

  it('aria-live 요약에 모든 버킷 값 표기', () => {
    render(<FrequencyChart weekly={weekly} monthly={monthly} />);
    expect(screen.getByText(/5\/1 0회, 5\/8 4회, 5\/15 2회/)).toBeInTheDocument();
  });

  it('월간 토글 시 월간 데이터 렌더 + 목표선 제거', async () => {
    const user = userEvent.setup();
    render(<FrequencyChart weekly={weekly} monthly={monthly} />);
    await user.click(screen.getByRole('radio', { name: '월간' }));

    expect(screen.getByRole('radio', { name: '월간' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByText('목표 주 3회')).not.toBeInTheDocument();
    expect(screen.getByText(/5월 5회, 6월 3회/)).toBeInTheDocument();
    expect(screen.getByText(/최근 2개월 월간 세션 수/)).toBeInTheDocument();
  });
});
