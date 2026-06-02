import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
// entity→entity 의존이지만 **타입 전용**(Technique·SessionWithDisciplines) — 런타임 결합 없음(import type).
// AND 필터 결과를 라이브러리/캘린더와 동일한 합성 타입으로 돌려주기 위해 각 엔티티 공개 배럴에서
// 타입만 가져온다(technique-queries 가 SessionWithDisciplines 를 가져오는 것과 동일한 의도된 예외).
import type { Technique } from '@/entities/technique';
import type { SessionWithDisciplines } from '@/entities/session';

/**
 * 태그 entity 데이터 접근 (client) — PRD F7 / Develop §9 (tags/taggables).
 *
 * `createSupabaseBrowserClient()`(publishable 키 + 실 `Database` 타입)로 RLS(본인 행만) 하에
 * tags/taggables 를 조회한다. technique-queries / calendar-queries 와 동일 관용구.
 *
 * 호출부(TagsView / SessionEditorForm / TechniqueForm)는 `enabled: isAuthEnabled()` 로 게이팅한다 →
 * AUTH OFF(개발 셸)면 쿼리 비활성 → 자동완성/결과는 휴면 빈 상태(Supabase 무접촉, infra-last 보존).
 * AUTH ON(현재)이면 실데이터. 단 tags/taggables 행은 **태그 attach(쓰기, F7 후속)** 가 붙어야 생기므로
 * 그 전까지는 라이브 쿼리가 정상적으로 빈 결과를 돌려준다(가짜 데이터 금지).
 */

/** 사용자 태그 이름 목록(자동완성 suggestions). RLS로 본인 것만, 이름 오름차순. */
export async function fetchTagNames(): Promise<string[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('tags')
    .select('name')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((t) => t.name);
}

/**
 * 한 기술에 달린 태그 이름들 — 편집 폼 prefill용 (F4-AC3 / #6-1).
 * `taggables` → `tags(name)` 임베드(tag_id NOT NULL → to-one). RLS로 본인 것만.
 * 폼이 이 값으로 tagNames를 채워, 저장 시 재동기화(삭제 후 재삽입)가 기존 태그를 보존한다.
 */
export async function fetchTechniqueTagNames(techniqueId: string): Promise<string[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('taggables')
    .select('tags(name)')
    .eq('technique_id', techniqueId);
  if (error) throw error;
  return (data ?? [])
    .map((row) => row.tags?.name)
    .filter((n): n is string => !!n);
}

/** AND 필터 결과 — 선택한 태그를 **모두** 가진 기술/세션. */
export interface TaggedItems {
  techniques: Technique[];
  sessions: SessionWithDisciplines[];
}

/** Map<항목id, 그 항목에 달린 distinct tag_id 집합>에 (key, tagId) 누적. */
function addLink(map: Map<string, Set<string>>, key: string, tagId: string): void {
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  set.add(tagId);
}

/**
 * 선택한 태그 이름을 **모두(AND)** 가진 기술/세션 조회 (F7-AC3 / Design §7f).
 *
 * 1) 이름 → tag id (RLS 본인 태그, unique(user_id, name)). 선택 이름 중 하나라도 미존재면
 *    AND를 만족할 항목이 없으므로 즉시 빈 결과(존재하지 않는 태그는 어떤 항목에도 없음).
 * 2) 해당 tag id 들이 달린 taggables(듀얼 FK) 수집.
 * 3) 항목별 distinct tag 수가 선택 수와 같은 것만 추림(= 전부 가짐).
 * 4) 그 항목 본체를 페치(기술=*, 세션=종목 임베드 평탄화). 구성 형태 일치 → narrow 캐스트(any 미사용).
 */
export async function fetchTaggedItems(tagNames: string[]): Promise<TaggedItems> {
  const empty: TaggedItems = { techniques: [], sessions: [] };
  const names = Array.from(new Set(tagNames.map((n) => n.trim()).filter(Boolean)));
  if (names.length === 0) return empty;

  const supabase = createSupabaseBrowserClient();

  // 1) 이름 → tag id
  const { data: tagRows, error: tagErr } = await supabase
    .from('tags')
    .select('id, name')
    .in('name', names);
  if (tagErr) throw tagErr;
  const ids = (tagRows ?? []).map((t) => t.id);
  if (ids.length < names.length) return empty; // 미존재 태그 포함 → AND 불가능

  // 2) taggables 수집
  const { data: links, error: linkErr } = await supabase
    .from('taggables')
    .select('tag_id, session_id, technique_id')
    .in('tag_id', ids);
  if (linkErr) throw linkErr;

  // 3) 전부(AND) 가진 항목만
  const required = ids.length;
  const techTags = new Map<string, Set<string>>();
  const sessTags = new Map<string, Set<string>>();
  for (const l of links ?? []) {
    if (l.technique_id) addLink(techTags, l.technique_id, l.tag_id);
    if (l.session_id) addLink(sessTags, l.session_id, l.tag_id);
  }
  const techniqueIds = [...techTags.entries()]
    .filter(([, s]) => s.size >= required)
    .map(([id]) => id);
  const sessionIds = [...sessTags.entries()]
    .filter(([, s]) => s.size >= required)
    .map(([id]) => id);
  if (techniqueIds.length === 0 && sessionIds.length === 0) return empty;

  // 4) 항목 본체 페치
  let techniques: Technique[] = [];
  if (techniqueIds.length > 0) {
    const { data, error } = await supabase
      .from('techniques')
      .select('*')
      .in('id', techniqueIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    techniques = (data ?? []) as Technique[];
  }

  let sessions: SessionWithDisciplines[] = [];
  if (sessionIds.length > 0) {
    const { data, error } = await supabase
      .from('sessions')
      .select(
        '*, session_disciplines(discipline), taggables(tags(name)), session_techniques(day_memo_md, techniques(id, name, discipline)), media_links(media_assets(id, kind, youtube_video_id, storage_path, title))',
      )
      .in('id', sessionIds)
      .order('trained_on', { ascending: false });
    if (error) throw error;
    sessions = (data ?? []).map(
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

  return { techniques, sessions };
}
