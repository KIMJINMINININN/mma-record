import dayjs from 'dayjs';

import {
  applyFacets,
  isAnyFacetActive,
  parseFacetsFromSearchParams,
  searchAll,
  SearchFacetBar,
  SearchResults,
} from '@/features/global-search';
import { EmptyState, SearchIcon } from '@/shared/ui';

/**
 * 검색 결과 (F8 / Design §7e) — searchAll + 패싯(종목·기간, F8-AC4) 연동.
 *
 * 상단 검색바에서 `?q=`(+`?discipline`/`?period`)로 진입 → `searchAll(q)` 후 applyFacets(클라 파생, 서버 RSC에서 적용).
 * 패싯 활성 시 limit을 100으로 상향(상위 N 절단 완화 — 전수 아님, RPC 파라미터화는 후속).
 * 도먼시(인프라 last): 플래그 OFF/빈 쿼리면 searchAll이 [] → 일반 EmptyState(가짜 결과 없음).
 * Next 16: searchParams는 Promise → async에서 await (이 페이지는 그래서 ƒ Dynamic — 정상).
 */

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    discipline?: string | string[];
    period?: string | string[];
    belt?: string | string[];
  }>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? '').trim();

  const facets = parseFacetsFromSearchParams(sp);
  const active = isAnyFacetActive(facets);
  const today = dayjs().format('YYYY-MM-DD');

  // 패싯 활성이면 후보를 더 넓게(100) 받아 클라 절단 영향을 줄인다.
  const rawResults = q ? await searchAll(q, active ? 100 : 30) : [];
  const results = applyFacets(rawResults, facets, today);

  return (
    <section aria-labelledby="search-heading" className="mx-auto max-w-3xl">
      <h1 id="search-heading" className="sr-only">
        검색 결과
      </h1>

      <p className="mb-4 flex items-center gap-2 text-heading-s text-[var(--text-strong)]">
        <SearchIcon width={20} height={20} className="text-[var(--text-muted)]" />
        {q ? (
          <span>
            <span className="text-[var(--text-muted)]">검색:</span>{' '}
            <span className="text-[var(--primary)]">“{q}”</span>
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">검색어를 입력하세요</span>
        )}
      </p>

      {q ? (
        <>
          <SearchFacetBar query={q} facets={facets} />
          {/* 패싯 무매치 안내는 '검색 결과가 있었는데 패싯으로 0이 된' 경우만(도먼시 오인 방지). */}
          <SearchResults results={results} query={q} facetsActive={active && rawResults.length > 0} />
        </>
      ) : (
        <EmptyState
          icon={<SearchIcon width={40} height={40} />}
          title="무엇을 찾고 있나요?"
          description="기술 이름·세션 메모·태그를 한 번에 검색할 수 있습니다."
        />
      )}
    </section>
  );
}
