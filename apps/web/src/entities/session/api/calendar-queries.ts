import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import type { Discipline } from '@/shared/model/enums';
import type { CalendarDaySummaryMap } from '../model/calendar-day-summary';
import type { SessionWithDisciplines } from '../model/session';

/**
 * 캘린더 핵심 루프의 entity 데이터 접근 (client) — PRD F2 / Develop §4.5.
 *
 * 두 읽기 함수는 모두 `createSupabaseBrowserClient()`(publishable 키 + 실 `Database` 타입)로
 * RLS(security_invoker 뷰 · 세션 테이블 정책) 하에 **본인 데이터만** 가져온다.
 *
 * 호출부(CalendarScreen)는 이 함수들을 `enabled: isAuthEnabled()` 로 게이팅한다 →
 * AUTH OFF(개발 셸)면 쿼리가 비활성 → UI는 휴면 빈 상태 유지(Supabase 호출 없음, infra-last 보존).
 * AUTH ON(현재)이면 실데이터. (Develop §10 게이팅)
 */

/**
 * 월(가시 범위)의 `calendar_day_summary` 뷰 조회 → 'YYYY-MM-DD' 키 맵 (PRD F2 / Develop §4.5).
 * `rangeStart`/`rangeEnd` 는 'YYYY-MM-DD'(KST 날짜). 뷰는 세션 있는 날만 행을 가지므로
 * 키 부재 = 빈 날(그리드 셀에 점/숫자 없음 — CalendarMonthGrid가 O(1)로 조회).
 */
export async function fetchCalendarDaySummaries(
  rangeStart: string,
  rangeEnd: string,
): Promise<CalendarDaySummaryMap> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('calendar_day_summary')
    .select('trained_on, session_count, disciplines, has_media')
    .gte('trained_on', rangeStart)
    .lte('trained_on', rangeEnd);
  if (error) throw error;
  const map: CalendarDaySummaryMap = {};
  for (const row of data ?? []) {
    if (!row.trained_on) continue;
    map[row.trained_on] = {
      trained_on: row.trained_on,
      session_count: row.session_count ?? 0,
      // 뷰 컬럼은 discipline[] | null(array_agg filter) — null이면 빈 배열로 정규화.
      disciplines: (row.disciplines ?? []) as Discipline[],
      has_media: row.has_media ?? false,
    };
  }
  return map;
}

/**
 * sessions + 종목/태그/기술/미디어 임베드 셀렉트 — fetchDaySessions(단일 날짜)와
 * fetchRangeSessions(범위)가 공유한다(동일 셀렉트가 두 곳에서 어긋나지 않도록 단일 출처).
 * 문자열 리터럴 const라 Supabase 임베드 타입 추론은 그대로 보존된다.
 */
const SESSION_EMBED_SELECT =
  '*, session_disciplines(discipline), taggables(tags(name)), session_techniques(day_memo_md, techniques(id, name, discipline)), media_links(media_assets(id, kind, youtube_video_id, storage_path, thumbnail_path, external_url, title))';

/**
 * 선택 날짜의 sessions + 종목(N:M) 조회 → `SessionWithDisciplines[]` (PRD F2 / Develop §4.5).
 * `dateISO` 는 'YYYY-MM-DD'. 임베드 셀렉트 `session_disciplines(discipline)` 는
 * sessions↔session_disciplines FK(session_disciplines_session_id_fkey)로 중첩 배열을 타입 추론한다.
 */
export async function fetchDaySessions(dateISO: string): Promise<SessionWithDisciplines[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_EMBED_SELECT)
    .eq('trained_on', dateISO)
    .order('created_at', { ascending: true });
  if (error) throw error;
  // sessions Row는 Session 모델과 1:1(snake_case·nullability 동일) → 중첩 종목·태그·기술·미디어만 평탄화해 합성.
  // 구성 형태가 SessionWithDisciplines와 정확히 일치하므로 마지막에 narrow 캐스트만 적용(any 미사용).
  return (data ?? []).map(
    ({ session_disciplines, taggables, session_techniques, media_links, ...s }) => ({
      ...s,
      disciplines: (session_disciplines ?? []).map((sd) => sd.discipline),
      tags: (taggables ?? []).map((t) => t.tags?.name).filter((n): n is string => !!n),
      techniques: (session_techniques ?? [])
        .filter((st) => st.techniques != null)
        .map((st) => ({ ...st.techniques!, day_memo_md: st.day_memo_md })),
      media: (media_links ?? [])
        .map((ml) => ml.media_assets)
        .filter((m): m is NonNullable<typeof m> => m != null),
    }),
  ) as SessionWithDisciplines[];
}

/**
 * 날짜 범위 [startISO, endISO]의 sessions(+종목/태그/기술/미디어) 조회 → `SessionWithDisciplines[]`
 * (F2 주간/아젠다 뷰 / 구현계획 §3). fetchDaySessions와 동일 셀렉트·평탄화의 **범위 버전**:
 * `.eq('trained_on')` 대신 `.gte/.lte`로 범위를 잡고 trained_on→created_at 순으로 정렬한다.
 * `startISO`/`endISO`는 'YYYY-MM-DD'(KST). 호출부가 `enabled: isAuthEnabled()`로 게이팅.
 */
export async function fetchRangeSessions(
  startISO: string,
  endISO: string,
): Promise<SessionWithDisciplines[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_EMBED_SELECT)
    .gte('trained_on', startISO)
    .lte('trained_on', endISO)
    .order('trained_on', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(
    ({ session_disciplines, taggables, session_techniques, media_links, ...s }) => ({
      ...s,
      disciplines: (session_disciplines ?? []).map((sd) => sd.discipline),
      tags: (taggables ?? []).map((t) => t.tags?.name).filter((n): n is string => !!n),
      techniques: (session_techniques ?? [])
        .filter((st) => st.techniques != null)
        .map((st) => ({ ...st.techniques!, day_memo_md: st.day_memo_md })),
      media: (media_links ?? [])
        .map((ml) => ml.media_assets)
        .filter((m): m is NonNullable<typeof m> => m != null),
    }),
  ) as SessionWithDisciplines[];
}
