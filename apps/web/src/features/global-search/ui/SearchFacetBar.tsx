'use client';

import { useRouter } from 'next/navigation';

import { DISCIPLINE_META } from '@/entities/discipline';
import { DISCIPLINES, type Discipline } from '@/shared/model/enums';
import { Button } from '@/shared/ui';

import {
  clearFacets,
  isAnyFacetActive,
  SEARCH_PERIODS,
  type SearchFacets,
  type SearchPeriod,
} from '../model/facets';
import { buildSearchHref } from '../model/search-params';

/**
 * SearchFacetBar — 검색 패싯 바(종목·기간) (F8-AC4 / Design §7e). TechniqueFilterBar SELECT_BASE 미러.
 *
 * 패싯은 URL(?q&discipline&period) 구동 — 변경 시 router.replace(히스토리 누적 없음)로 갱신하면
 * /search RSC가 다시 렌더되며 applyFacets가 서버에서 적용된다. 벨트 패싯은 RPC 미투영으로 후속(제외).
 */

const PERIOD_LABEL: Record<SearchPeriod, string> = {
  all: '기간 전체',
  week: '이번 주',
  month: '이번 달',
  '90d': '최근 90일',
  year: '최근 1년',
};

const SELECT_BASE = [
  'h-8 rounded-xxs pl-2.5 pr-7 text-button-s',
  'bg-[var(--surface-base)] text-[var(--text-default)]',
  'border border-[var(--border-strong)]',
  'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
  'outline-none focus-visible:shadow-[var(--ring-focus)]',
  'pointer-hover:border-[var(--border-default)]',
].join(' ');

export interface SearchFacetBarProps {
  query: string;
  facets: SearchFacets;
}

export function SearchFacetBar({ query, facets }: SearchFacetBarProps) {
  const router = useRouter();
  const go = (next: SearchFacets) => router.replace(buildSearchHref(query, next));

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <select
        aria-label="종목 필터"
        value={facets.discipline ?? ''}
        onChange={(e) => go({ ...facets, discipline: (e.target.value || null) as Discipline | null })}
        className={SELECT_BASE}
      >
        <option value="">종목 전체</option>
        {DISCIPLINES.map((d) => (
          <option key={d} value={d}>
            {DISCIPLINE_META[d].label}
          </option>
        ))}
      </select>

      <select
        aria-label="기간 필터"
        value={facets.period ?? 'all'}
        onChange={(e) => {
          const v = e.target.value as SearchPeriod;
          go({ ...facets, period: v === 'all' ? null : v });
        }}
        className={SELECT_BASE}
      >
        {SEARCH_PERIODS.map((p) => (
          <option key={p} value={p}>
            {PERIOD_LABEL[p]}
          </option>
        ))}
      </select>

      {isAnyFacetActive(facets) && (
        <Button variant="ghost" size="sm" onClick={() => go(clearFacets(facets))}>
          필터 초기화
        </Button>
      )}
    </div>
  );
}
