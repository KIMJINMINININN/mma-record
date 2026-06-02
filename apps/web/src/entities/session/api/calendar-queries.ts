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
 * 선택 날짜의 sessions + 종목(N:M) 조회 → `SessionWithDisciplines[]` (PRD F2 / Develop §4.5).
 * `dateISO` 는 'YYYY-MM-DD'. 임베드 셀렉트 `session_disciplines(discipline)` 는
 * sessions↔session_disciplines FK(session_disciplines_session_id_fkey)로 중첩 배열을 타입 추론한다.
 */
export async function fetchDaySessions(dateISO: string): Promise<SessionWithDisciplines[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('sessions')
    .select(
      '*, session_disciplines(discipline), taggables(tags(name)), session_techniques(day_memo_md, techniques(id, name, discipline)), media_links(media_assets(id, kind, youtube_video_id, storage_path, title))',
    )
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
