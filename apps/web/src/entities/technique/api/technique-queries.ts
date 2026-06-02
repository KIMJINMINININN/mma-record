import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
// entity→entity 의존이지만 **타입 전용**(SessionWithDisciplines) — 런타임 결합 없음(import type).
// 역참조 결과를 calendar-queries 의 fetchDaySessions 와 동일한 합성 타입으로 반환하기 위해
// session 엔티티의 공개 배럴(@/entities/session)에서 타입만 가져온다(세그먼트 경로 직참조 회피).
import type { SessionWithDisciplines } from '@/entities/session';
import type { Technique } from '../model/technique';

/**
 * 기술 라이브러리 entity 데이터 접근 (client) — PRD F4 / Develop §4.5.
 *
 * `createSupabaseBrowserClient()`(publishable 키 + 실 `Database` 타입)로 RLS(본인 행만)
 * 하에 techniques 테이블을 조회한다. calendar-queries 와 동일 관용구.
 *
 * 호출부(TechniqueLibrary / TechniqueDetailView / TechniqueForm)는 이 함수들을
 * `enabled: isAuthEnabled()` 로 게이팅한다 → AUTH OFF(개발 셸)면 쿼리가 비활성 →
 * UI는 휴면 빈 상태/플레이스홀더 유지(Supabase 호출 없음, infra-last 보존).
 * AUTH ON(현재)이면 실데이터. (Develop §10 게이팅)
 */

/**
 * 사용자 기술 전체 조회(최근순). RLS로 본인 것만 (PRD F4).
 * techniques Row는 Technique 모델과 1:1(snake_case 필드·nullability 동일, enum 동일 union)이므로
 * 마지막에 narrow 캐스트만 적용한다(Row vs zod-inferred 형태 일치, any 미사용).
 */
export async function fetchTechniques(): Promise<Technique[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('techniques')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Technique[];
}

/**
 * 단일 기술 조회(RLS 본인 것). 없으면 null (PRD F4-AC3 — 상세/편집 prefill).
 * `maybeSingle()` 이라 행이 없으면 data=null(에러 아님) → null 반환.
 * techniques Row는 Technique 모델과 1:1 → narrow 캐스트만(any 미사용).
 */
export async function fetchTechniqueById(id: string): Promise<Technique | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('techniques')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Technique | null) ?? null;
}

/**
 * 이 기술을 다룬 세션(역참조) — session_techniques → sessions(+종목) (PRD F4-AC3 / Design §7d).
 *
 * 임베드 셀렉트 `sessions(*, session_disciplines(discipline))`:
 *  - `session_techniques.session_id` 는 NOT NULL FK(session_techniques_session_id_fkey)이므로
 *    `sessions` 임베드는 **to-one**(단일 객체)로 추론된다(배열 아님). 방어적으로 null 행은 건너뛴다.
 *  - 안쪽 `session_disciplines(discipline)` 는 sessions↔session_disciplines FK로 종목 배열을 추론
 *    (calendar-queries.fetchDaySessions 와 동일 관용구).
 *
 * 각 행의 sessions 임베드를 평탄화 → calendar 와 동일한 `SessionWithDisciplines` 합성 형태로 만든다
 * (session 본체 + disciplines: Discipline[]). 구성 형태가 정확히 일치하므로 narrow 캐스트만(any 미사용).
 * 정렬은 trained_on desc(최근 훈련부터) — 동률이면 created_at desc 로 안정화한다.
 */
export async function fetchTechniqueSessions(
  techniqueId: string,
): Promise<SessionWithDisciplines[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('session_techniques')
    .select(
      'sessions(*, session_disciplines(discipline), taggables(tags(name)), session_techniques(day_memo_md, techniques(id, name, discipline)), media_links(media_assets(id, kind, youtube_video_id, storage_path, title)))',
    )
    .eq('technique_id', techniqueId);
  if (error) throw error;

  return (data ?? [])
    // to-one 임베드라 단일 객체이지만, 방어적으로 null(고아 행 등)은 제외한다.
    .map((row) => row.sessions)
    .filter((s): s is NonNullable<typeof s> => s != null)
    // sessions Row는 Session 모델과 1:1 → 중첩 종목·태그·기술·미디어만 평탄화해 합성.
    .map(({ session_disciplines, taggables, session_techniques, media_links, ...s }) => ({
      ...s,
      disciplines: (session_disciplines ?? []).map((sd) => sd.discipline),
      tags: (taggables ?? []).map((t) => t.tags?.name).filter((n): n is string => !!n),
      techniques: (session_techniques ?? [])
        .filter((st) => st.techniques != null)
        .map((st) => ({ ...st.techniques!, day_memo_md: st.day_memo_md })),
      media: (media_links ?? [])
        .map((ml) => ml.media_assets)
        .filter((m): m is NonNullable<typeof m> => m != null),
    }))
    // 최근 훈련부터(trained_on desc). 동일 날짜는 created_at desc 로 안정 정렬.
    .sort((a, b) => {
      if (a.trained_on !== b.trained_on) return a.trained_on < b.trained_on ? 1 : -1;
      return a.created_at < b.created_at ? 1 : -1;
    }) as SessionWithDisciplines[];
}
