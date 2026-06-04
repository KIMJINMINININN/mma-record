import dayjs from 'dayjs';

import { DISCIPLINES, type Belt, type Discipline } from '@/shared/model/enums';

import type { SearchResult } from './search';

/**
 * 검색 패싯(종목/기간) — 순수 함수 (F8-AC4 / Design §7e). React/Supabase 의존 없음.
 *
 * 종목은 technique 행의 subtitle(종목 코드), 벨트는 technique 행의 belt 컬럼(0019 투영), 기간은
 * session 행의 subtitle(YYYY-MM-DD)에서 파생해 **클라이언트에서** 거른다.
 * **대칭 규칙(symmetric keep-non-domain-rows)**: 종목·벨트 패싯은 technique 행만, 기간 패싯은 session
 * 행만 제약하고 — 그 외 종류(특히 tag) 행은 모든 패싯을 통과시킨다.
 *
 * 주의(p_limit): 클라 패싯은 RPC가 이미 돌려준 상위 N행만 거른다(page에서 패싯 활성 시 limit 상향).
 * 전수 필터가 아니다 — 큰 결과셋에서 일부 누락 가능(문서화된 한계, RPC 파라미터화는 후속).
 */

export type SearchPeriod = 'all' | 'week' | 'month' | '90d' | 'year';
export const SEARCH_PERIODS: readonly SearchPeriod[] = ['all', 'week', 'month', '90d', 'year'] as const;

export interface SearchFacets {
  discipline: Discipline | null;
  /** null = 전체 기간('all'). */
  period: Exclude<SearchPeriod, 'all'> | null;
  /** 벨트 패싯 — technique 행만 제약(주짓수 belt 코드). null = 전체. */
  belt: Belt | null;
}

export const DEFAULT_SEARCH_FACETS: SearchFacets = { discipline: null, period: null, belt: null };

export function isAnyFacetActive(f: SearchFacets): boolean {
  return f.discipline !== null || f.period !== null || f.belt !== null;
}

export function clearFacets(f: SearchFacets): SearchFacets {
  return { ...f, discipline: null, period: null, belt: null };
}

export interface PeriodRange {
  from: string;
  to: string;
}

/** 기간 프리셋 → [from, to] 'YYYY-MM-DD' (today 기준). 주 시작은 locale-독립 일요일(weekRange/stats와 동일 규칙). */
export function resolvePeriodRange(period: Exclude<SearchPeriod, 'all'>, today: string): PeriodRange {
  const d = dayjs(today);
  const from =
    period === 'week'
      ? d.subtract(d.day(), 'day').format('YYYY-MM-DD') // day(): 0=일 → 일요일 시작(locale 무관)
      : period === 'month'
        ? d.startOf('month').format('YYYY-MM-DD')
        : period === '90d'
          ? d.subtract(90, 'day').format('YYYY-MM-DD')
          : d.subtract(1, 'year').format('YYYY-MM-DD'); // 'year'
  return { from, to: today };
}

function isDisciplineSubtitle(value: string | null): value is Discipline {
  return value != null && (DISCIPLINES as readonly string[]).includes(value);
}

function isSessionDateInRange(subtitle: string | null, r: PeriodRange): boolean {
  return subtitle != null && subtitle >= r.from && subtitle <= r.to;
}

/**
 * 패싯 적용(대칭 규칙). 종목은 technique 행만, 기간은 session 행만 제약. tag 행은 두 패싯 모두 통과.
 * 입력 비변형(새 배열 반환).
 */
export function applyFacets(results: SearchResult[], f: SearchFacets, today: string): SearchResult[] {
  const range = f.period ? resolvePeriodRange(f.period, today) : null;
  return results.filter((r) => {
    if (f.discipline !== null && r.result_type === 'technique') {
      if (!isDisciplineSubtitle(r.subtitle) || r.subtitle !== f.discipline) return false;
    }
    // 벨트 패싯도 종목과 동일한 대칭 규칙 — technique 행만 belt 로 제약(세션/태그는 통과).
    if (f.belt !== null && r.result_type === 'technique') {
      if (r.belt !== f.belt) return false;
    }
    if (range !== null && r.result_type === 'session') {
      if (!isSessionDateInRange(r.subtitle, range)) return false;
    }
    return true;
  });
}
