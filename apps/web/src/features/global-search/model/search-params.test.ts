import { describe, it, expect } from 'vitest';
import { parseFacetsFromSearchParams, buildSearchHref } from './search-params';
import { DEFAULT_SEARCH_FACETS, type SearchFacets } from './facets';

describe('parseFacetsFromSearchParams', () => {
  it('유효 값 파싱', () => {
    expect(parseFacetsFromSearchParams({ discipline: 'bjj_gi', period: 'month' })).toEqual({
      discipline: 'bjj_gi',
      period: 'month',
    });
  });
  it('미지 종목 → null', () => {
    expect(parseFacetsFromSearchParams({ discipline: 'xyz' }).discipline).toBeNull();
  });
  it('미지 기간 → null', () => {
    expect(parseFacetsFromSearchParams({ period: 'decade' }).period).toBeNull();
  });
  it("period 'all' → null", () => {
    expect(parseFacetsFromSearchParams({ period: 'all' }).period).toBeNull();
  });
  it('배열이면 [0]', () => {
    expect(parseFacetsFromSearchParams({ discipline: ['mma', 'bjj_gi'] }).discipline).toBe('mma');
  });
  it('없으면 default', () => {
    expect(parseFacetsFromSearchParams({})).toEqual(DEFAULT_SEARCH_FACETS);
  });
});

describe('buildSearchHref', () => {
  it('빈 쿼리 + default → /search', () => {
    expect(buildSearchHref('', DEFAULT_SEARCH_FACETS)).toBe('/search');
  });
  it('쿼리 + 패싯 → q·discipline·period 순서', () => {
    expect(buildSearchHref('guard', { discipline: 'bjj_gi', period: 'month' })).toBe(
      '/search?q=guard&discipline=bjj_gi&period=month',
    );
  });
  it('null 패싯 생략', () => {
    expect(buildSearchHref('x', { discipline: 'mma', period: null })).toBe('/search?q=x&discipline=mma');
  });
  it('q는 encodeURIComponent(공백·&)', () => {
    expect(buildSearchHref('a b&c', DEFAULT_SEARCH_FACETS)).toBe('/search?q=a%20b%26c');
  });
  it('라운드트립: parse(build) === facets', () => {
    const f: SearchFacets = { discipline: 'wrestling', period: '90d' };
    const href = buildSearchHref('q', f);
    const qs = href.split('?')[1] ?? '';
    const params = new URLSearchParams(qs);
    expect(
      parseFacetsFromSearchParams({
        discipline: params.get('discipline') ?? undefined,
        period: params.get('period') ?? undefined,
      }),
    ).toEqual(f);
  });
});
