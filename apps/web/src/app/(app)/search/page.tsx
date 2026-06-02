import { searchAll, SearchResults } from '@/features/global-search';
import { EmptyState, SearchIcon } from '@/shared/ui';

/**
 * 검색 결과 (F8 / Design §7e) — searchAll 연동.
 *
 * 상단 검색바에서 `?q=` 로 진입 → `searchAll(q)`(server util)로 통합 검색.
 * 도먼시(인프라 last): 플래그 OFF/빈 쿼리면 searchAll이 Supabase 무접촉으로 [] 반환 →
 * SearchResults가 쿼리 인지형 EmptyState를 보여준다(가짜 결과 없음). 인프라 후 실 RPC로 그룹 결과.
 * Next 16: searchParams는 Promise → async에서 await (이 페이지는 그래서 ƒ Dynamic — 정상).
 */

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? '').trim();

  const results = q ? await searchAll(q) : [];

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
        <SearchResults results={results} query={q} />
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
