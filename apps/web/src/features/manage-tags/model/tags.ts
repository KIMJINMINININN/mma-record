import type { Tag } from '@/entities/tag';

/**
 * 태그 관리 정렬/병합 — 순수 함수(React/Supabase 의존 없음). F7-AC4 "사용 빈도순 정렬".
 *
 * 빈도(usage count)는 호출부가 client 집계(fetchTagUsageCounts)로 만든 Map<tag_id, count>를 넘긴다.
 * 빈도 동률은 이름 가나다로 안정화. 입력 비변형(새 배열/객체 반환).
 */

export interface TagWithCount extends Tag {
  count: number;
}

export type TagManagerSort = 'frequency' | 'name';

/** 태그 행에 사용 횟수를 합쳐 TagWithCount[]로(맵에 없으면 0). 입력 비변형. */
export function mergeTagCounts(tags: Tag[], counts: Map<string, number>): TagWithCount[] {
  return tags.map((t) => ({ ...t, count: counts.get(t.id) ?? 0 }));
}

/** 빈도순(desc, 동률 이름 가나다) 또는 이름순(가나다). 입력 비변형. */
export function sortTags(list: TagWithCount[], sort: TagManagerSort): TagWithCount[] {
  return [...list].sort((a, b) =>
    sort === 'name'
      ? a.name.localeCompare(b.name, 'ko')
      : b.count - a.count || a.name.localeCompare(b.name, 'ko'),
  );
}
