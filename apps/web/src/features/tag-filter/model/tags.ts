/**
 * 태그 이름 helpers — 순수 함수(React 의존 없음). PRD F7 / Develop §9 (tags/taggables).
 *
 * 자유 태그(F7-AC1)와 다중 AND 필터(F7-AC3)에서 공유한다.
 * `tags` 테이블은 unique(user_id, name)이지만 UI 단계에서는 사용자 입력 이름 배열만 다루므로
 * 영속화(행→id 매핑)는 인프라 후로 미룬다(SessionEditorForm 의 tag_ids 시밍 주석 참고).
 *
 * 중복 판정은 **대소문자 무시**(tagKey)로 통일한다 — DB unique 제약과 달리 UI는 사용자가
 * 같은 태그를 대소문자만 바꿔 두 번 넣는 실수를 막는 게 목적. 표시는 원래 입력 대소문자를 보존.
 */

/** 태그 이름 정규화: 앞뒤 공백 제거. (대소문자는 보존하되 중복은 대소문자 무시로 판정.) */
export function normalizeTagName(raw: string): string {
  return raw.trim();
}

/** 대소문자 무시 중복 판정 키. */
export function tagKey(name: string): string {
  return name.trim().toLowerCase();
}

/** name을 list에 추가(정규화 + 대소문자무시 중복 제거 + 빈문자 무시). 변경 없으면 동일 배열 반환. */
export function addTag(list: string[], raw: string): string[] {
  const name = normalizeTagName(raw);
  if (name === '') return list; // 빈 입력 무시
  const key = tagKey(name);
  if (list.some((t) => tagKey(t) === key)) return list; // 대소문자무시 중복 → 변경 없음(동일 참조)
  return [...list, name];
}

/** index 제거. 범위 밖이면 동일 배열 반환. */
export function removeTagAt(list: string[], index: number): string[] {
  if (index < 0 || index >= list.length) return list;
  return list.filter((_, i) => i !== index);
}

/** 입력어로 suggestions 필터(대소문자 무시 부분일치, 이미 선택된 건 제외). */
export function filterSuggestions(
  suggestions: string[],
  query: string,
  selected: string[],
): string[] {
  const q = tagKey(query);
  const selectedKeys = new Set(selected.map(tagKey));
  return suggestions.filter((s) => {
    const k = tagKey(s);
    if (selectedKeys.has(k)) return false; // 이미 선택됨
    return q === '' ? true : k.includes(q); // 빈 쿼리면 전체, 아니면 부분일치
  });
}

/** 한 항목(세션/기술)에 붙일 수 있는 태그 최대 개수(UI 가드). */
export const DEFAULT_MAX_TAGS = 12;
