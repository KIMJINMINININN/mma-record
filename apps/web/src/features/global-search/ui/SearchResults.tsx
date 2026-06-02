import Link from 'next/link';

import { DISCIPLINE_META, DisciplineChip } from '@/entities/discipline';
import { DISCIPLINES, type Discipline } from '@/shared/model/enums';
import { EmptyState, SearchIcon } from '@/shared/ui';

import { groupResults, resultHref, type SearchResult } from '../model/search';
import { Highlight } from './Highlight';

/**
 * SearchResults — 타입별 그룹 검색 결과 (F8 / Design §7e).
 *
 * `groupResults`로 기술/세션/태그 묶음 → 비어있지 않은 그룹만 순서대로(기술·세션·태그)
 * `<h2>라벨 (n)</h2>` + 결과 행 리스트 렌더. 각 행은 `resultHref`로 상세 링크 + 제목 키워드
 * 하이라이트(Highlight, XSS 안전) + 부가표시(기술=종목칩/세션=날짜/태그=항목).
 * 결과가 0이면 쿼리 인지형 EmptyState(가짜 결과 만들지 않음 — 도먼시 안내 카피).
 *
 * 표시 전용 → 서버 컴포넌트. (그룹 렌더는 page가 q!=='' 일 때만 호출)
 */

export interface SearchResultsProps {
  results: SearchResult[];
  query: string;
}

/** 그룹 렌더 순서 + 한글 라벨 (Design §7e). */
const GROUP_ORDER = [
  { key: 'technique', label: '기술' },
  { key: 'session', label: '세션' },
  { key: 'tag', label: '태그' },
] as const;

/** subtitle 문자열이 Discipline 코드인지 좁힘(기술 행 종목칩 표시용). */
function asDiscipline(value: string | null): Discipline | null {
  return value != null && (DISCIPLINES as readonly string[]).includes(value)
    ? (value as Discipline)
    : null;
}

/** 한 결과 행 — 상세 링크 + 하이라이트 제목 + 종류별 부가표시. */
function ResultRow({ result, query }: { result: SearchResult; query: string }) {
  const discipline = result.result_type === 'technique' ? asDiscipline(result.subtitle) : null;

  return (
    <li>
      <Link
        href={resultHref(result)}
        className={[
          'flex items-center gap-2 rounded-xs px-3 py-2.5',
          'bg-[var(--surface-raised)] text-body-s-500 text-[var(--text-default)]',
          'border border-[var(--border-default)]',
          'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
          'hover:bg-[var(--surface-sunken)] hover:border-[var(--border-strong)]',
          'outline-none focus-visible:border-[var(--primary)] focus-visible:shadow-[var(--ring-focus)]',
        ].join(' ')}
      >
        {/* 태그 행: # 마커로 시각적 종류 표시(색 의존 없이) */}
        {result.result_type === 'tag' && (
          <span aria-hidden="true" className="text-[var(--text-muted)]">
            #
          </span>
        )}

        <Highlight text={result.title} query={query} className="min-w-0 flex-1 truncate" />

        {/* 부가표시: 기술=종목칩 / 세션=날짜 / 태그=null */}
        {discipline ? (
          <DisciplineChip discipline={discipline} size="xs" className="shrink-0" />
        ) : result.result_type === 'technique' && result.subtitle ? (
          <span className="shrink-0 text-button-xxs text-[var(--text-muted)]">
            {DISCIPLINE_META_LABEL(result.subtitle)}
          </span>
        ) : result.result_type === 'session' && result.subtitle ? (
          <time
            dateTime={result.subtitle}
            className="shrink-0 text-button-xxs tabular-nums text-[var(--text-muted)]"
          >
            {result.subtitle}
          </time>
        ) : null}
      </Link>
    </li>
  );
}

/** 종목 코드 → 한글 라벨(칩으로 좁혀지지 않은 비정상 값의 폴백 표시). */
function DISCIPLINE_META_LABEL(code: string): string {
  const meta = (DISCIPLINE_META as Record<string, { label: string } | undefined>)[code];
  return meta?.label ?? code;
}

export function SearchResults({ results, query }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <EmptyState
        icon={<SearchIcon width={40} height={40} />}
        title={`“${query}”에 대한 결과가 없습니다`}
        description="검색 연동 후 일치하는 기술·세션·태그가 여기에 모입니다."
      />
    );
  }

  const grouped = groupResults(results);

  return (
    <div className="flex flex-col gap-5">
      {GROUP_ORDER.map(({ key, label }) => {
        const items = grouped[key];
        if (items.length === 0) return null;
        return (
          <section key={key} aria-label={`${label} 결과`}>
            <h2 className="mb-1.5 text-heading-xs text-[var(--text-strong)]">
              {label} <span className="text-[var(--text-muted)]">({items.length})</span>
            </h2>
            <ul className="flex flex-col gap-1.5">
              {items.map((result) => (
                <ResultRow key={`${result.result_type}-${result.result_id}`} result={result} query={query} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
