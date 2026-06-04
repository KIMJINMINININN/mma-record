/**
 * 글로벌 검색 모델 (F8 / Design §7e / Develop §0012 search_all).
 *
 * search_all RPC 한 행의 형태 + result_type별 그룹화 + 결과 행 → 상세 경로 매핑.
 * 표시·라우팅 순수 함수만 — Supabase 접촉 없음(서버 util은 ../api/search-all.ts).
 */

/** search_all RPC 한 행 (Develop §0012). */
export interface SearchResult {
  /** 결과 종류 — 그룹 헤더/라우팅 분기 키. */
  result_type: 'technique' | 'session' | 'tag';
  result_id: string;
  /** 기술명 · 체육관/날짜 · 태그명 (하이라이트 대상). */
  title: string;
  /** 부가표시(기술=종목 코드, 세션=YYYY-MM-DD, 태그=null). */
  subtitle: string | null;
  /** 벨트(기술 행만 — 주짓수면 belt 코드; 비벨트 종목·세션·태그는 null). 벨트 패싯용(F8-AC4, 0019 투영). */
  belt: string | null;
  /** RPC hybrid rank (prefix 1.0 > substring 0.7 > trigram). */
  rank: number;
}

/** result_type별 그룹 묶음 (Design §7e — 기술/세션/태그). */
export interface GroupedResults {
  technique: SearchResult[];
  session: SearchResult[];
  tag: SearchResult[];
}

/**
 * result_type별로 그룹화한다.
 * 입력은 rank desc 정렬 가정(RPC가 `order by rank desc` 보장) → 그룹 내 순서를 그대로 유지.
 */
export function groupResults(results: SearchResult[]): GroupedResults {
  const grouped: GroupedResults = { technique: [], session: [], tag: [] };
  for (const r of results) {
    grouped[r.result_type].push(r);
  }
  return grouped;
}

/**
 * 결과 행 → 상세 경로.
 * - technique → `/techniques/{id}` (라우트 트리 `[techniqueId]`).
 * - tag → `/tags` (선택 상태는 인프라 후 딥링크 TODO; 현 셸은 태그 보기로 이동).
 * - session → `/calendar?date={subtitle}` (subtitle=YYYY-MM-DD). 세션 단독 상세 라우트는
 *   없으므로 캘린더 날짜 딥링크로 이동(?date 딥링크 처리는 문서화된 인프라 TODO이나 경로 자체는 유효).
 */
export function resultHref(r: SearchResult): string {
  switch (r.result_type) {
    case 'technique':
      return `/techniques/${r.result_id}`;
    case 'tag':
      return '/tags';
    case 'session':
      return r.subtitle ? `/calendar?date=${encodeURIComponent(r.subtitle)}` : '/calendar';
  }
}
