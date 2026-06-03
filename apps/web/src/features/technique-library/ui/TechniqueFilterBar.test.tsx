// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

afterEach(cleanup);
import {
  DISCIPLINES,
  BELTS,
  LEVELS,
} from '@/shared/model/enums';
import { DISCIPLINE_META } from '@/entities/discipline';
import { BELT_META } from '@/entities/rank';
import { LEVEL_META } from '@/entities/technique';
import {
  DEFAULT_TECHNIQUE_FILTERS,
  type TechniqueFilters,
} from '../model/filters';
import { TechniqueFilterBar } from '@/features/technique-library/ui/TechniqueFilterBar';

const defaultFilters: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS };

describe('TechniqueFilterBar', () => {
  // --- Rendering ---

  it('renders 6 selects (종목/분류/포지션/벨트/레벨/정렬)', () => {
    render(<TechniqueFilterBar filters={defaultFilters} onChange={vi.fn()} />);
    // comboboxes = <select> elements in RTL
    expect(screen.getAllByRole('combobox')).toHaveLength(6);
  });

  it('renders 종목 select with aria-label "종목 필터"', () => {
    render(<TechniqueFilterBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: '종목 필터' })).toBeInTheDocument();
  });

  it('renders 분류 select with aria-label "분류 필터"', () => {
    render(<TechniqueFilterBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: '분류 필터' })).toBeInTheDocument();
  });

  it('renders 포지션 select with aria-label "포지션 필터"', () => {
    render(<TechniqueFilterBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: '포지션 필터' })).toBeInTheDocument();
  });

  it('renders 벨트 select with aria-label "벨트 필터"', () => {
    render(<TechniqueFilterBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: '벨트 필터' })).toBeInTheDocument();
  });

  it('renders 레벨 select with aria-label "레벨 필터"', () => {
    render(<TechniqueFilterBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: '레벨 필터' })).toBeInTheDocument();
  });

  it('renders 정렬 select with aria-label "정렬"', () => {
    render(<TechniqueFilterBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: '정렬' })).toBeInTheDocument();
  });

  // --- No clear button when no filter active ---

  it('does NOT render "필터 초기화" button when all filters are null', () => {
    render(<TechniqueFilterBar filters={defaultFilters} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: '필터 초기화' })).not.toBeInTheDocument();
  });

  // --- Clear button visible when a filter is active ---

  it('renders "필터 초기화" button when discipline filter is set', () => {
    render(
      <TechniqueFilterBar
        filters={{ ...defaultFilters, discipline: 'bjj_gi' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: '필터 초기화' })).toBeInTheDocument();
  });

  it('renders "필터 초기화" button when category filter is set', () => {
    render(
      <TechniqueFilterBar
        filters={{ ...defaultFilters, category: 'guard' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: '필터 초기화' })).toBeInTheDocument();
  });

  it('renders "필터 초기화" button when belt filter is set', () => {
    render(
      <TechniqueFilterBar
        filters={{ ...defaultFilters, belt: 'blue' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: '필터 초기화' })).toBeInTheDocument();
  });

  // --- 종목 select onChange ---

  it('selecting a discipline calls onChange with that discipline set', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TechniqueFilterBar filters={defaultFilters} onChange={onChange} />);
    const select = screen.getByRole('combobox', { name: '종목 필터' });
    await user.selectOptions(select, 'bjj_gi');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ discipline: 'bjj_gi' }),
    );
  });

  it('selecting "" (전체) in 종목 calls onChange with discipline: null', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TechniqueFilterBar
        filters={{ ...defaultFilters, discipline: 'mma' }}
        onChange={onChange}
      />,
    );
    const select = screen.getByRole('combobox', { name: '종목 필터' });
    await user.selectOptions(select, '');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ discipline: null }),
    );
  });

  it('선택한 종목 외 다른 필터 필드는 보존된다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const filters: TechniqueFilters = { ...defaultFilters, belt: 'purple' };
    render(<TechniqueFilterBar filters={filters} onChange={onChange} />);
    await user.selectOptions(screen.getByRole('combobox', { name: '종목 필터' }), 'striking');
    const next: TechniqueFilters = onChange.mock.calls[0][0];
    expect(next.belt).toBe('purple');
    expect(next.discipline).toBe('striking');
  });

  // --- 분류 select onChange ---

  it('selecting a category calls onChange with that category set', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TechniqueFilterBar filters={defaultFilters} onChange={onChange} />);
    const select = screen.getByRole('combobox', { name: '분류 필터' });
    await user.selectOptions(select, 'submission');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'submission' }),
    );
  });

  it('selecting "" in 분류 calls onChange with category: null', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TechniqueFilterBar
        filters={{ ...defaultFilters, category: 'pass' }}
        onChange={onChange}
      />,
    );
    await user.selectOptions(screen.getByRole('combobox', { name: '분류 필터' }), '');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ category: null }),
    );
  });

  // --- 포지션 select onChange ---

  it('selecting a position calls onChange with that position set', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TechniqueFilterBar filters={defaultFilters} onChange={onChange} />);
    await user.selectOptions(screen.getByRole('combobox', { name: '포지션 필터' }), 'mount');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'mount' }),
    );
  });

  it('selecting "" in 포지션 calls onChange with position: null', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TechniqueFilterBar
        filters={{ ...defaultFilters, position: 'standing' }}
        onChange={onChange}
      />,
    );
    await user.selectOptions(screen.getByRole('combobox', { name: '포지션 필터' }), '');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ position: null }),
    );
  });

  // --- 벨트 select onChange ---

  it('selecting a belt calls onChange with that belt set', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TechniqueFilterBar filters={defaultFilters} onChange={onChange} />);
    await user.selectOptions(screen.getByRole('combobox', { name: '벨트 필터' }), 'blue');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ belt: 'blue' }),
    );
  });

  it('selecting "" in 벨트 calls onChange with belt: null', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TechniqueFilterBar
        filters={{ ...defaultFilters, belt: 'black' }}
        onChange={onChange}
      />,
    );
    await user.selectOptions(screen.getByRole('combobox', { name: '벨트 필터' }), '');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ belt: null }),
    );
  });

  // --- 레벨 select onChange ---

  it('selecting a level calls onChange with that level set', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TechniqueFilterBar filters={defaultFilters} onChange={onChange} />);
    await user.selectOptions(screen.getByRole('combobox', { name: '레벨 필터' }), 'intermediate');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'intermediate' }),
    );
  });

  it('selecting "" in 레벨 calls onChange with level: null', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TechniqueFilterBar
        filters={{ ...defaultFilters, level: 'advanced' }}
        onChange={onChange}
      />,
    );
    await user.selectOptions(screen.getByRole('combobox', { name: '레벨 필터' }), '');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ level: null }),
    );
  });

  // --- 정렬 select onChange ---

  it('changing sort to "name" calls onChange with sort: "name"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TechniqueFilterBar filters={defaultFilters} onChange={onChange} />);
    await user.selectOptions(screen.getByRole('combobox', { name: '정렬' }), 'name');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'name' }),
    );
  });

  it('changing sort back to "recent" calls onChange with sort: "recent"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TechniqueFilterBar
        filters={{ ...defaultFilters, sort: 'name' }}
        onChange={onChange}
      />,
    );
    await user.selectOptions(screen.getByRole('combobox', { name: '정렬' }), 'recent');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'recent' }),
    );
  });

  it('changing sort does NOT affect discipline/category/position/belt fields', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const filters: TechniqueFilters = {
      ...defaultFilters,
      discipline: 'wrestling',
      sort: 'recent',
    };
    render(<TechniqueFilterBar filters={filters} onChange={onChange} />);
    await user.selectOptions(screen.getByRole('combobox', { name: '정렬' }), 'name');
    const next: TechniqueFilters = onChange.mock.calls[0][0];
    expect(next.discipline).toBe('wrestling');
    expect(next.sort).toBe('name');
  });

  // --- 필터 초기화 button ---

  it('"필터 초기화" button calls onChange with all filters cleared but sort preserved', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const filters: TechniqueFilters = {
      discipline: 'bjj_gi',
      category: 'guard',
      position: 'mount',
      belt: 'blue',
      level: 'beginner',
      favoriteOnly: true,
      sort: 'name',
    };
    render(<TechniqueFilterBar filters={filters} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next: TechniqueFilters = onChange.mock.calls[0][0];
    expect(next.discipline).toBeNull();
    expect(next.category).toBeNull();
    expect(next.position).toBeNull();
    expect(next.belt).toBeNull();
    expect(next.level).toBeNull();
    expect(next.favoriteOnly).toBe(false);
    // sort is preserved
    expect(next.sort).toBe('name');
  });

  // --- 즐겨찾기만 토글 ---

  it('renders 즐겨찾기 toggle (aria-pressed reflects favoriteOnly)', () => {
    const { rerender } = render(
      <TechniqueFilterBar filters={defaultFilters} onChange={vi.fn()} />,
    );
    const toggle = screen.getByRole('button', { name: '즐겨찾기만 보기' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    rerender(
      <TechniqueFilterBar
        filters={{ ...defaultFilters, favoriteOnly: true }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: '즐겨찾기만 보기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('clicking 즐겨찾기 toggle flips favoriteOnly', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TechniqueFilterBar filters={defaultFilters} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '즐겨찾기만 보기' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ favoriteOnly: true }));
  });

  it('정렬 select offers 즐겨찾기순 option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TechniqueFilterBar filters={defaultFilters} onChange={onChange} />);
    await user.selectOptions(screen.getByRole('combobox', { name: '정렬' }), 'favorites');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sort: 'favorites' }));
  });

  // --- Option content sanity checks ---

  it('종목 select contains all discipline labels as options', () => {
    render(<TechniqueFilterBar filters={defaultFilters} onChange={vi.fn()} />);
    const select = screen.getByRole('combobox', { name: '종목 필터' });
    DISCIPLINES.forEach((d) => {
      expect(select).toContainElement(
        screen.getByRole('option', { name: DISCIPLINE_META[d].label }),
      );
    });
  });

  it('벨트 select contains all belt labels as options', () => {
    render(<TechniqueFilterBar filters={defaultFilters} onChange={vi.fn()} />);
    const select = screen.getByRole('combobox', { name: '벨트 필터' });
    BELTS.forEach((b) => {
      expect(select).toContainElement(
        screen.getByRole('option', { name: BELT_META[b].label }),
      );
    });
  });

  it('레벨 select contains all level labels as options', () => {
    render(<TechniqueFilterBar filters={defaultFilters} onChange={vi.fn()} />);
    const select = screen.getByRole('combobox', { name: '레벨 필터' });
    LEVELS.forEach((lv) => {
      expect(select).toContainElement(
        screen.getByRole('option', { name: LEVEL_META[lv].label }),
      );
    });
  });
});
