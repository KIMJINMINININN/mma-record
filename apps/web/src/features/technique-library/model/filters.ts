import type { Technique } from '@/entities/technique';
import type { Discipline, TechniqueCategory, PositionKind, Belt, Level } from '@/shared/model/enums';

/**
 * 기술 라이브러리 필터/정렬 모델 (F4-AC4 / Design §7d).
 *
 * 순수 함수만 노출 — 인프라 휴면 동안에는 빈 배열에 적용되지만,
 * 인프라 연결 후 실데이터(Technique[])에도 동일 로직이 그대로 동작한다.
 * UI 상태(useState)는 TechniqueLibrary 가 소유하고, 여기서는 형태/로직만 정의한다.
 */

export type TechniqueSort = 'recent' | 'name' | 'favorites';

export interface TechniqueFilters {
  discipline: Discipline | null;
  category: TechniqueCategory | null;
  position: PositionKind | null;
  belt: Belt | null;
  /** 레벨 적합도(비벨트 종목 — 레슬링·타격·MMA). belt 와 상호배타. */
  level: Level | null;
  /** 즐겨찾기만 보기(PRD §9 P1). true면 is_favorite 인 기술만 통과. */
  favoriteOnly: boolean;
  sort: TechniqueSort;
}

export const DEFAULT_TECHNIQUE_FILTERS: TechniqueFilters = {
  discipline: null,
  category: null,
  position: null,
  belt: null,
  level: null,
  favoriteOnly: false,
  sort: 'recent',
};

/** 정렬을 제외한 필터(종목/분류/포지션/벨트/레벨/즐겨찾기) 중 하나라도 활성인가. */
export function isAnyFilterActive(f: TechniqueFilters): boolean {
  return (
    f.discipline !== null ||
    f.category !== null ||
    f.position !== null ||
    f.belt !== null ||
    f.level !== null ||
    f.favoriteOnly
  );
}

/** 정렬은 유지하고 필터(종목/분류/포지션/벨트/레벨/즐겨찾기)만 해제한다. */
export function clearFilters(f: TechniqueFilters): TechniqueFilters {
  return {
    ...f,
    discipline: null,
    category: null,
    position: null,
    belt: null,
    level: null,
    favoriteOnly: false,
  };
}

/** 필터 적용 + 정렬 (순수 함수 — 인프라 때 실데이터에도 그대로 동작). */
export function filterAndSortTechniques(list: Technique[], f: TechniqueFilters): Technique[] {
  const filtered = list.filter(
    (t) =>
      (f.discipline === null || t.discipline === f.discipline) &&
      (f.category === null || t.category === f.category) &&
      (f.position === null || t.position === f.position) &&
      (f.belt === null || t.belt === f.belt) &&
      (f.level === null || t.level === f.level) &&
      (!f.favoriteOnly || t.is_favorite),
  );
  const sorted = [...filtered].sort((a, b) => {
    if (f.sort === 'name') return a.name.localeCompare(b.name, 'ko');
    // 'favorites' = 즐겨찾기 먼저(is_favorite desc), 동률은 최근순(created_at desc).
    if (f.sort === 'favorites' && a.is_favorite !== b.is_favorite) {
      return a.is_favorite ? -1 : 1;
    }
    return b.created_at.localeCompare(a.created_at); // 'recent' / favorites 동률 = created_at desc
  });
  return sorted;
}
