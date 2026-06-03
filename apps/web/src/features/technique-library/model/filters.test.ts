import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TECHNIQUE_FILTERS,
  isAnyFilterActive,
  clearFilters,
  filterAndSortTechniques,
  type TechniqueFilters,
} from '@/features/technique-library/model/filters';
import type { Technique } from '@/entities/technique';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE: Technique = {
  id: '00000000-0000-0000-0000-000000000001',
  user_id: '00000000-0000-0000-0000-000000000099',
  name: 'Armbar',
  discipline: 'bjj_gi',
  category: 'submission',
  position: 'mount',
  striking_style: null,
  belt: 'blue',
  belt_stripes: 0,
  level: null,
  is_favorite: false,
  description_md: null,
  details_md: null,
  visibility: 'private',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

function makeTechnique(overrides: Partial<Technique>): Technique {
  return { ...BASE, ...overrides };
}

const SWEEP: Technique = makeTechnique({
  id: '00000000-0000-0000-0000-000000000002',
  name: '스윕',
  discipline: 'bjj_nogi',
  category: 'sweep',
  position: 'closed_guard',
  belt: 'white',
  created_at: '2024-03-01T00:00:00.000Z',
});

const TAKEDOWN: Technique = makeTechnique({
  id: '00000000-0000-0000-0000-000000000003',
  name: '더블렉',
  discipline: 'wrestling',
  category: 'takedown',
  position: 'standing',
  belt: null,
  level: 'intermediate',
  created_at: '2024-02-01T00:00:00.000Z',
});

const PUNCH: Technique = makeTechnique({
  id: '00000000-0000-0000-0000-000000000004',
  name: '잽',
  discipline: 'striking',
  category: 'punch',
  position: null,
  striking_style: 'boxing',
  belt: null,
  level: 'beginner',
  created_at: '2024-04-01T00:00:00.000Z',
});

const LIST = [BASE, SWEEP, TAKEDOWN, PUNCH]; // Armbar, 스윕, 더블렉, 잽

// ---------------------------------------------------------------------------
// DEFAULT_TECHNIQUE_FILTERS
// ---------------------------------------------------------------------------

describe('DEFAULT_TECHNIQUE_FILTERS', () => {
  it('has all filter fields null and sort=recent', () => {
    expect(DEFAULT_TECHNIQUE_FILTERS).toEqual({
      discipline: null,
      category: null,
      position: null,
      belt: null,
      level: null,
      favoriteOnly: false,
      sort: 'recent',
    });
  });
});

// ---------------------------------------------------------------------------
// isAnyFilterActive
// ---------------------------------------------------------------------------

describe('isAnyFilterActive', () => {
  it('returns false when all filters are null', () => {
    expect(isAnyFilterActive(DEFAULT_TECHNIQUE_FILTERS)).toBe(false);
  });

  it('returns true when discipline is set', () => {
    expect(isAnyFilterActive({ ...DEFAULT_TECHNIQUE_FILTERS, discipline: 'bjj_gi' })).toBe(true);
  });

  it('returns true when category is set', () => {
    expect(isAnyFilterActive({ ...DEFAULT_TECHNIQUE_FILTERS, category: 'submission' })).toBe(true);
  });

  it('returns true when position is set', () => {
    expect(isAnyFilterActive({ ...DEFAULT_TECHNIQUE_FILTERS, position: 'mount' })).toBe(true);
  });

  it('returns true when belt is set', () => {
    expect(isAnyFilterActive({ ...DEFAULT_TECHNIQUE_FILTERS, belt: 'blue' })).toBe(true);
  });

  it('returns true when level is set', () => {
    expect(isAnyFilterActive({ ...DEFAULT_TECHNIQUE_FILTERS, level: 'beginner' })).toBe(true);
  });

  it('returns true when favoriteOnly is set', () => {
    expect(isAnyFilterActive({ ...DEFAULT_TECHNIQUE_FILTERS, favoriteOnly: true })).toBe(true);
  });

  it('returns false when only sort differs (sort is not a filter)', () => {
    const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, sort: 'name' };
    expect(isAnyFilterActive(f)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clearFilters
// ---------------------------------------------------------------------------

describe('clearFilters', () => {
  it('clears all filter fields (incl. favoriteOnly)', () => {
    const active: TechniqueFilters = {
      discipline: 'bjj_gi',
      category: 'submission',
      position: 'mount',
      belt: 'blue',
      level: 'beginner',
      favoriteOnly: true,
      sort: 'recent',
    };
    const result = clearFilters(active);
    expect(result.discipline).toBeNull();
    expect(result.category).toBeNull();
    expect(result.position).toBeNull();
    expect(result.belt).toBeNull();
    expect(result.level).toBeNull();
    expect(result.favoriteOnly).toBe(false);
  });

  it('preserves the sort field', () => {
    const withNameSort: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, sort: 'name' };
    expect(clearFilters(withNameSort).sort).toBe('name');

    const withRecentSort: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, sort: 'recent' };
    expect(clearFilters(withRecentSort).sort).toBe('recent');
  });

  it('does not mutate the input object', () => {
    const original: TechniqueFilters = {
      discipline: 'wrestling',
      category: 'takedown',
      position: 'standing',
      belt: 'white',
      level: 'intermediate',
      favoriteOnly: true,
      sort: 'name',
    };
    const snapshot = { ...original };
    clearFilters(original);
    expect(original).toEqual(snapshot);
  });

  it('returns a new object reference', () => {
    const f = { ...DEFAULT_TECHNIQUE_FILTERS };
    expect(clearFilters(f)).not.toBe(f);
  });
});

// ---------------------------------------------------------------------------
// filterAndSortTechniques
// ---------------------------------------------------------------------------

describe('filterAndSortTechniques', () => {
  describe('empty / pass-through', () => {
    it('returns all items when no filter is active', () => {
      const result = filterAndSortTechniques(LIST, DEFAULT_TECHNIQUE_FILTERS);
      expect(result).toHaveLength(LIST.length);
    });

    it('returns empty array for empty input', () => {
      expect(filterAndSortTechniques([], DEFAULT_TECHNIQUE_FILTERS)).toEqual([]);
    });
  });

  describe('single filter', () => {
    it('filters by discipline', () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, discipline: 'bjj_gi' };
      const result = filterAndSortTechniques(LIST, f);
      expect(result.every((t) => t.discipline === 'bjj_gi')).toBe(true);
      expect(result.map((t) => t.id)).toContain(BASE.id);
    });

    it('filters by category', () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, category: 'submission' };
      const result = filterAndSortTechniques(LIST, f);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(BASE.id);
    });

    it('filters by position', () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, position: 'mount' };
      const result = filterAndSortTechniques(LIST, f);
      expect(result.every((t) => t.position === 'mount')).toBe(true);
      expect(result.map((t) => t.id)).toContain(BASE.id);
    });

    it('filters by belt', () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, belt: 'blue' };
      const result = filterAndSortTechniques(LIST, f);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(BASE.id);
    });

    it('items with null belt are excluded when belt filter is active', () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, belt: 'blue' };
      const result = filterAndSortTechniques(LIST, f);
      expect(result.some((t) => t.belt === null)).toBe(false);
    });

    it('items with null position are excluded when position filter is active', () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, position: 'standing' };
      const result = filterAndSortTechniques(LIST, f);
      expect(result.some((t) => t.position === null)).toBe(false);
    });

    it('filters by level (non-belt disciplines)', () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, level: 'intermediate' };
      const result = filterAndSortTechniques(LIST, f);
      // only TAKEDOWN (wrestling) is 'intermediate'
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(TAKEDOWN.id);
    });

    it('items with null level (belt disciplines) are excluded when level filter is active', () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, level: 'beginner' };
      const result = filterAndSortTechniques(LIST, f);
      // only PUNCH (striking) is 'beginner'; bjj items (null level) excluded
      expect(result.every((t) => t.level === 'beginner')).toBe(true);
      expect(result.map((t) => t.id)).toEqual([PUNCH.id]);
    });
  });

  describe('multiple filters AND-combined', () => {
    it('only returns items matching ALL active filters', () => {
      const f: TechniqueFilters = {
        ...DEFAULT_TECHNIQUE_FILTERS,
        discipline: 'bjj_gi',
        category: 'submission',
      };
      const result = filterAndSortTechniques(LIST, f);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(BASE.id);
    });

    it('returns empty when no item matches all filters', () => {
      const f: TechniqueFilters = {
        ...DEFAULT_TECHNIQUE_FILTERS,
        discipline: 'bjj_gi',
        category: 'takedown', // Armbar is submission, not takedown
      };
      expect(filterAndSortTechniques(LIST, f)).toHaveLength(0);
    });

    it('three simultaneous filters narrow correctly', () => {
      const f: TechniqueFilters = {
        ...DEFAULT_TECHNIQUE_FILTERS,
        discipline: 'bjj_gi',
        category: 'submission',
        position: 'mount',
      };
      const result = filterAndSortTechniques(LIST, f);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(BASE.id);
    });

    it('all filters narrow correctly', () => {
      const f: TechniqueFilters = {
        discipline: 'bjj_gi',
        category: 'submission',
        position: 'mount',
        belt: 'blue',
        level: null, // bjj_gi uses belt, not level → null means "include all"
        favoriteOnly: false,
        sort: 'recent',
      };
      const result = filterAndSortTechniques(LIST, f);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(BASE.id);
    });
  });

  describe('sort: name (Korean localeCompare)', () => {
    it('sorts ascending by name with Korean locale', () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, sort: 'name' };
      const result = filterAndSortTechniques(LIST, f);
      const names = result.map((t) => t.name);
      const expected = [...names].sort((a, b) => a.localeCompare(b, 'ko'));
      expect(names).toEqual(expected);
    });

    it('Korean names sort correctly (가나다 order)', () => {
      const 가 = makeTechnique({ id: '00000000-0000-0000-0000-000000000010', name: '가드' });
      const 나 = makeTechnique({ id: '00000000-0000-0000-0000-000000000011', name: '낙법' });
      const 다 = makeTechnique({ id: '00000000-0000-0000-0000-000000000012', name: '다운' });
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, sort: 'name' };
      const result = filterAndSortTechniques([나, 다, 가], f);
      expect(result.map((t) => t.name)).toEqual(['가드', '낙법', '다운']);
    });

    it('한글 comes after ASCII in Korean locale', () => {
      const ascii = makeTechnique({ id: '00000000-0000-0000-0000-000000000020', name: 'Armbar' });
      const korean = makeTechnique({ id: '00000000-0000-0000-0000-000000000021', name: '암바' });
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, sort: 'name' };
      const result = filterAndSortTechniques([korean, ascii], f);
      // Verify order matches localeCompare('ko')
      const expected = [ascii, korean].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      expect(result.map((t) => t.id)).toEqual(expected.map((t) => t.id));
    });
  });

  describe('sort: recent (created_at desc)', () => {
    it('sorts by created_at descending', () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, sort: 'recent' };
      const result = filterAndSortTechniques(LIST, f);
      // PUNCH 2024-04, SWEEP 2024-03, TAKEDOWN 2024-02, BASE 2024-01
      expect(result[0].id).toBe(PUNCH.id);
      expect(result[result.length - 1].id).toBe(BASE.id);
    });

    it('each item has created_at >= the next item', () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, sort: 'recent' };
      const result = filterAndSortTechniques(LIST, f);
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].created_at >= result[i + 1].created_at).toBe(true);
      }
    });
  });

  describe('favorites: favoriteOnly filter + sort', () => {
    const FAV: Technique = makeTechnique({
      id: '00000000-0000-0000-0000-000000000030',
      name: '즐겨찾기 기술',
      is_favorite: true,
      created_at: '2024-01-15T00:00:00.000Z',
    });
    const FAV_LIST = [BASE, SWEEP, TAKEDOWN, PUNCH, FAV]; // only FAV is favorited

    it('favoriteOnly=true returns only favorited techniques', () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, favoriteOnly: true };
      const result = filterAndSortTechniques(FAV_LIST, f);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(FAV.id);
    });

    it('favoriteOnly=false includes non-favorited', () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, favoriteOnly: false };
      expect(filterAndSortTechniques(FAV_LIST, f)).toHaveLength(FAV_LIST.length);
    });

    it("sort='favorites' pins favorited first", () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, sort: 'favorites' };
      const result = filterAndSortTechniques(FAV_LIST, f);
      expect(result[0].id).toBe(FAV.id);
      expect(result.slice(1).every((t) => !t.is_favorite)).toBe(true);
    });

    it("sort='favorites' breaks ties by created_at desc", () => {
      const f: TechniqueFilters = { ...DEFAULT_TECHNIQUE_FILTERS, sort: 'favorites' };
      const tail = filterAndSortTechniques(FAV_LIST, f).slice(1); // non-favorited tail
      for (let i = 0; i < tail.length - 1; i++) {
        expect(tail[i].created_at >= tail[i + 1].created_at).toBe(true);
      }
    });
  });

  describe('immutability', () => {
    it('does not mutate the input array', () => {
      const input = [...LIST];
      const snapshot = [...input];
      filterAndSortTechniques(input, { ...DEFAULT_TECHNIQUE_FILTERS, sort: 'name' });
      expect(input.map((t) => t.id)).toEqual(snapshot.map((t) => t.id));
    });

    it('returns a new array reference', () => {
      const input = [BASE];
      const result = filterAndSortTechniques(input, DEFAULT_TECHNIQUE_FILTERS);
      expect(result).not.toBe(input);
    });
  });
});
