import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import { countTopTechniques, type SessionTechniqueRow, type StatSessionRow, type TopTechnique } from '../lib/stats';

/**
 * F10 통계 데이터 접근 (client) — PRD §F10 / 구현계획 §2.
 *
 * 두 fetcher 모두 `createSupabaseBrowserClient()`로 RLS(`auth.uid() = user_id` ·
 * 정션 테이블 parent-ownership) 하에 **본인 데이터만** 가져온다(수동 user_id 필터 없음).
 * 집계는 전부 클라이언트 순수 함수(entities/session/lib/stats.ts)에서 수행한다 — DB 집계 없음(잠금 결정).
 *
 * **전체 기간 집계 + PostgREST 행 캡:** 통계는 전 기간을 합산하는데 PostgREST는 단일 응답을
 * max_rows(이 프로젝트 supabase/config.toml = 1000)로 자른다. 무제한 SELECT는 error 없이 조용히
 * 잘려(특히 session_techniques는 세션당 여러 행 → 가장 빨리 도달) 합계/랭킹을 왜곡한다.
 * → `.range()` 루프로 끝까지 페이지네이션해 클라이언트에서 모은다(여전히 순수 클라이언트, 잠금 유지).
 * 정렬을 안정 컬럼으로 고정해 페이지 경계가 결정적이게 한다.
 *
 * 호출부(StatsScreen)는 `enabled: isAuthEnabled()`로 게이팅 →
 * AUTH OFF면 쿼리 비활성(휴면 빈 상태, Supabase 호출 없음). (calendar-queries.ts와 동일 패턴)
 */

/** PostgREST max_rows(=config.toml 1000)와 동일 — 페이지 크기. */
const PAGE = 1000;

/**
 * 전 기간 세션의 슬림 행(trained_on · duration_min · 종목) — 매트타임/분포/빈도/스트릭 집계용.
 * 임베드 `session_disciplines(discipline)`을 평탄화해 `StatSessionRow[]`로 정규화하며,
 * 1000행 캡을 넘기지 않도록 `.range()`로 전 페이지를 모은다.
 */
export async function fetchAllSessionStatRows(): Promise<StatSessionRow[]> {
  const supabase = createSupabaseBrowserClient();
  const out: StatSessionRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('sessions')
      .select('trained_on, duration_min, session_disciplines(discipline)')
      .order('trained_on', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const page = data ?? [];
    for (const { session_disciplines, ...s } of page) {
      out.push({
        trained_on: s.trained_on,
        duration_min: s.duration_min,
        disciplines: (session_disciplines ?? []).map((sd) => sd.discipline),
      });
    }
    if (page.length < PAGE) break;
  }
  return out;
}

/**
 * 최다 복습 기술 상위 `limit`개. session_techniques(본인 소유, parent-ownership RLS) 전 행을
 * 페이지네이션으로 모아 technique_id로 그룹 카운트(countTopTechniques). 그룹/정렬은 순수 함수에서.
 */
export async function fetchTopTechniques(limit = 5): Promise<TopTechnique[]> {
  const supabase = createSupabaseBrowserClient();
  const rows: SessionTechniqueRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('session_techniques')
      .select('technique_id, techniques(id, name, discipline)')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const page = data ?? [];
    for (const r of page) rows.push({ technique_id: r.technique_id, techniques: r.techniques });
    if (page.length < PAGE) break;
  }
  return countTopTechniques(rows, limit);
}
