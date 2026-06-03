// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

import { SearchFacetBar } from './SearchFacetBar';
import { DEFAULT_SEARCH_FACETS } from '../model/facets';

afterEach(() => {
  cleanup();
  replace.mockClear();
});

describe('SearchFacetBar', () => {
  it('현재 패싯 값이 select에 반영', () => {
    render(<SearchFacetBar query="guard" facets={{ discipline: 'bjj_gi', period: 'month' }} />);
    expect((screen.getByLabelText('종목 필터') as HTMLSelectElement).value).toBe('bjj_gi');
    expect((screen.getByLabelText('기간 필터') as HTMLSelectElement).value).toBe('month');
  });

  it('종목 변경 → router.replace(href, q+discipline 보존)', async () => {
    const user = userEvent.setup();
    render(<SearchFacetBar query="guard" facets={DEFAULT_SEARCH_FACETS} />);
    await user.selectOptions(screen.getByLabelText('종목 필터'), 'wrestling');
    expect(replace).toHaveBeenCalledWith('/search?q=guard&discipline=wrestling');
  });

  it("기간 'all' 선택 → period 제거", async () => {
    const user = userEvent.setup();
    render(<SearchFacetBar query="guard" facets={{ discipline: null, period: 'month' }} />);
    await user.selectOptions(screen.getByLabelText('기간 필터'), 'all');
    expect(replace).toHaveBeenCalledWith('/search?q=guard');
  });

  it('패싯 없으면 초기화 버튼 숨김', () => {
    render(<SearchFacetBar query="guard" facets={DEFAULT_SEARCH_FACETS} />);
    expect(screen.queryByRole('button', { name: '필터 초기화' })).not.toBeInTheDocument();
  });

  it('패싯 활성 시 초기화 → default href', async () => {
    const user = userEvent.setup();
    render(<SearchFacetBar query="guard" facets={{ discipline: 'mma', period: null }} />);
    await user.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(replace).toHaveBeenCalledWith('/search?q=guard');
  });
});
