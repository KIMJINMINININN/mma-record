import { BELTS, DISCIPLINES, type Belt, type Discipline } from '@/shared/model/enums';

import { SEARCH_PERIODS, type SearchFacets, type SearchPeriod } from './facets';

/**
 * 검색 URL ↔ 패싯 매핑 (F8 / Design §7e). 순수 함수.
 *
 * 파라미터 키: q / discipline / belt / period. 화이트리스트 검증(미지값·'all'→null, 배열→[0]).
 * q는 encodeURIComponent로 인코딩(resultHref와 동일 규약)해 SearchBar/FacetBar/page가 공유한다.
 */

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseFacetsFromSearchParams(sp: {
  discipline?: string | string[];
  period?: string | string[];
  belt?: string | string[];
}): SearchFacets {
  const d = first(sp.discipline);
  const p = first(sp.period);
  const b = first(sp.belt);
  const discipline =
    d != null && (DISCIPLINES as readonly string[]).includes(d) ? (d as Discipline) : null;
  const period =
    p != null && p !== 'all' && (SEARCH_PERIODS as readonly string[]).includes(p)
      ? (p as Exclude<SearchPeriod, 'all'>)
      : null;
  const belt = b != null && (BELTS as readonly string[]).includes(b) ? (b as Belt) : null;
  return { discipline, period, belt };
}

/** 쿼리 + 패싯 → /search href. q는 encodeURIComponent, null 패싯은 생략. 순서 q·discipline·belt·period. */
export function buildSearchHref(query: string, f: SearchFacets): string {
  const parts: string[] = [];
  const q = query.trim();
  if (q) parts.push(`q=${encodeURIComponent(q)}`);
  if (f.discipline) parts.push(`discipline=${f.discipline}`);
  if (f.belt) parts.push(`belt=${f.belt}`);
  if (f.period) parts.push(`period=${f.period}`);
  return parts.length > 0 ? `/search?${parts.join('&')}` : '/search';
}
