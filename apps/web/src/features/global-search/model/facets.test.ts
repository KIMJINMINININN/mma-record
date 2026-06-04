import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SEARCH_FACETS,
  applyFacets,
  clearFacets,
  isAnyFacetActive,
  resolvePeriodRange,
  type SearchFacets,
} from './facets';
import type { SearchResult } from './search';

const TODAY = '2024-06-15'; // 토요일

function r(
  result_type: SearchResult['result_type'],
  result_id: string,
  subtitle: string | null = null,
  belt: string | null = null,
): SearchResult {
  return { result_type, result_id, title: `${result_type}-${result_id}`, subtitle, belt, rank: 1 };
}
const facets = (f: Partial<SearchFacets>): SearchFacets => ({ ...DEFAULT_SEARCH_FACETS, ...f });

describe('default / isAnyFacetActive / clearFacets', () => {
  it('default = {discipline:null, period:null, belt:null}', () => {
    expect(DEFAULT_SEARCH_FACETS).toEqual({ discipline: null, period: null, belt: null });
  });
  it('isAnyFacetActive', () => {
    expect(isAnyFacetActive(DEFAULT_SEARCH_FACETS)).toBe(false);
    expect(isAnyFacetActive(facets({ discipline: 'bjj_gi' }))).toBe(true);
    expect(isAnyFacetActive(facets({ period: 'week' }))).toBe(true);
    expect(isAnyFacetActive(facets({ belt: 'blue' }))).toBe(true);
  });
  it('clearFacets nulls all, new ref, no mutate', () => {
    const f = facets({ discipline: 'mma', period: 'month', belt: 'blue' });
    const cleared = clearFacets(f);
    expect(cleared).toEqual({ discipline: null, period: null, belt: null });
    expect(cleared).not.toBe(f);
    expect(f.discipline).toBe('mma');
  });
});

describe('resolvePeriodRange', () => {
  it('week → 일요일 시작', () => {
    expect(resolvePeriodRange('week', TODAY)).toEqual({ from: '2024-06-09', to: '2024-06-15' });
  });
  it('month → 1일', () => {
    expect(resolvePeriodRange('month', TODAY)).toEqual({ from: '2024-06-01', to: '2024-06-15' });
  });
  it('90d → 90일 전', () => {
    expect(resolvePeriodRange('90d', TODAY)).toEqual({ from: '2024-03-17', to: '2024-06-15' });
  });
  it('year → 1년 전', () => {
    expect(resolvePeriodRange('year', TODAY)).toEqual({ from: '2023-06-15', to: '2024-06-15' });
  });
  it('year 윤일 클램프', () => {
    expect(resolvePeriodRange('year', '2024-02-29').from).toBe('2023-02-28');
  });
});

describe('applyFacets — 대칭 규칙', () => {
  it('패싯 없음 → 전부 유지', () => {
    const items = [r('technique', '1', 'bjj_gi'), r('session', '2', '2024-06-10'), r('tag', '3')];
    expect(applyFacets(items, DEFAULT_SEARCH_FACETS, TODAY)).toEqual(items);
  });

  it('빈 입력 → []', () => {
    expect(applyFacets([], facets({ discipline: 'bjj_gi' }), TODAY)).toEqual([]);
  });

  it('종목: 일치 technique만, 불일치/무종목 technique 제외, session·tag 통과', () => {
    const items = [
      r('technique', 'a', 'bjj_gi'),
      r('technique', 'b', 'wrestling'),
      r('technique', 'c', null),
      r('session', 's', '2024-06-10'),
      r('tag', 't'),
    ];
    const out = applyFacets(items, facets({ discipline: 'bjj_gi' }), TODAY);
    expect(out.map((x) => x.result_id)).toEqual(['a', 's', 't']);
  });

  it('기간: 범위 내 session만, 범위 밖/null session 제외, technique·tag 통과', () => {
    const items = [
      r('session', 'in', '2024-06-10'),
      r('session', 'before', '2024-05-31'),
      r('session', 'future', '2024-06-20'),
      r('session', 'nodate', null),
      r('technique', 'tech', 'bjj_gi'),
      r('tag', 'tag'),
    ];
    const out = applyFacets(items, facets({ period: 'month' }), TODAY); // 2024-06-01..06-15
    expect(out.map((x) => x.result_id)).toEqual(['in', 'tech', 'tag']);
  });

  it('경계 포함(from·to inclusive)', () => {
    const items = [r('session', 'from', '2024-06-01'), r('session', 'to', '2024-06-15')];
    const out = applyFacets(items, facets({ period: 'month' }), TODAY);
    expect(out.map((x) => x.result_id)).toEqual(['from', 'to']);
  });

  it('종목+기간 AND: 각 축이 해당 종류만 제약, tag는 양쪽 통과', () => {
    const items = [
      r('technique', 'a', 'bjj_gi'),
      r('technique', 'b', 'mma'),
      r('session', 'in', '2024-06-10'),
      r('session', 'out', '2024-01-01'),
      r('tag', 't'),
    ];
    const out = applyFacets(items, facets({ discipline: 'bjj_gi', period: 'month' }), TODAY);
    expect(out.map((x) => x.result_id)).toEqual(['a', 'in', 't']);
  });

  it('입력 비변형 + 새 배열', () => {
    const items = [r('technique', 'a', 'bjj_gi')];
    const out = applyFacets(items, facets({ discipline: 'mma' }), TODAY);
    expect(out).not.toBe(items);
    expect(items).toHaveLength(1);
  });

  it('벨트: 일치 technique만, 불일치/무벨트 technique 제외, session·tag 통과(대칭)', () => {
    const items = [
      r('technique', 'a', 'bjj_gi', 'blue'),
      r('technique', 'b', 'bjj_gi', 'purple'), // 벨트 불일치
      r('technique', 'c', 'wrestling', null), // 비벨트 종목 → belt null
      r('session', 's', '2024-06-10'),
      r('tag', 't'),
    ];
    const out = applyFacets(items, facets({ belt: 'blue' }), TODAY);
    expect(out.map((x) => x.result_id)).toEqual(['a', 's', 't']);
  });

  it('종목+벨트 AND: technique만 두 축 제약, tag 통과', () => {
    const items = [
      r('technique', 'a', 'bjj_gi', 'blue'),
      r('technique', 'b', 'bjj_nogi', 'blue'), // 종목 불일치
      r('technique', 'c', 'bjj_gi', 'black'), // 벨트 불일치
      r('tag', 't'),
    ];
    const out = applyFacets(items, facets({ discipline: 'bjj_gi', belt: 'blue' }), TODAY);
    expect(out.map((x) => x.result_id)).toEqual(['a', 't']);
  });
});
