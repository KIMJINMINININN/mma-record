import { describe, it, expect } from 'vitest';
import { TECHNIQUE_CATEGORIES } from '@/shared/model/enums';
import type { TechniqueCategory } from '@/shared/model/enums';
import { CATEGORY_LABEL, categoriesForDiscipline } from '@/entities/technique/lib/category-meta';

// Reference sets derived from source (category-meta.ts) for deterministic assertions.
const GRAPPLING_SET: TechniqueCategory[] = [
  'guard', 'pass', 'sweep', 'submission', 'takedown', 'escape', 'transition', 'control', 'defense', 'entry',
];
const STRIKING_SET: TechniqueCategory[] = [
  'punch', 'kick', 'knee', 'elbow', 'clinch', 'combination', 'defense', 'footwork', 'entry',
];

describe('categoriesForDiscipline', () => {
  describe('grappling disciplines share the same array contents', () => {
    it('bjj_gi returns grappling categories', () => {
      expect(categoriesForDiscipline('bjj_gi')).toEqual(GRAPPLING_SET);
    });

    it('bjj_nogi returns grappling categories', () => {
      expect(categoriesForDiscipline('bjj_nogi')).toEqual(GRAPPLING_SET);
    });

    it('wrestling returns grappling categories', () => {
      expect(categoriesForDiscipline('wrestling')).toEqual(GRAPPLING_SET);
    });

    it('bjj_gi and bjj_nogi return the same array reference (same constant)', () => {
      expect(categoriesForDiscipline('bjj_gi')).toBe(categoriesForDiscipline('bjj_nogi'));
    });

    it('bjj_gi and wrestling return the same array reference', () => {
      expect(categoriesForDiscipline('bjj_gi')).toBe(categoriesForDiscipline('wrestling'));
    });
  });

  describe('striking discipline', () => {
    it('striking returns striking categories', () => {
      expect(categoriesForDiscipline('striking')).toEqual(STRIKING_SET);
    });

    it('striking categories include defense (shared with grappling)', () => {
      expect(categoriesForDiscipline('striking')).toContain('defense');
    });

    it('striking categories include entry (shared)', () => {
      expect(categoriesForDiscipline('striking')).toContain('entry');
    });

    it('striking categories do NOT include grappling-only categories', () => {
      const result = categoriesForDiscipline('striking');
      expect(result).not.toContain('guard');
      expect(result).not.toContain('pass');
      expect(result).not.toContain('sweep');
      expect(result).not.toContain('submission');
      expect(result).not.toContain('takedown');
      expect(result).not.toContain('escape');
      expect(result).not.toContain('transition');
      expect(result).not.toContain('control');
    });
  });

  describe('mma = full union (all TECHNIQUE_CATEGORIES)', () => {
    it('mma returns all technique categories', () => {
      const result = categoriesForDiscipline('mma');
      // Must contain every category in TECHNIQUE_CATEGORIES
      for (const cat of TECHNIQUE_CATEGORIES) {
        expect(result).toContain(cat);
      }
    });

    it('mma result length equals TECHNIQUE_CATEGORIES length', () => {
      expect(categoriesForDiscipline('mma')).toHaveLength(TECHNIQUE_CATEGORIES.length);
    });

    it('mma includes mma-exclusive categories', () => {
      const result = categoriesForDiscipline('mma');
      expect(result).toContain('cage_work');
      expect(result).toContain('ground_and_pound');
    });

    it('mma result is a fresh copy (not the same reference as TECHNIQUE_CATEGORIES)', () => {
      // Source uses [...TECHNIQUE_CATEGORIES], so it is a new array each call.
      const result = categoriesForDiscipline('mma');
      expect(result).not.toBe(TECHNIQUE_CATEGORIES);
    });

    it('mma returns a new array each invocation', () => {
      expect(categoriesForDiscipline('mma')).not.toBe(categoriesForDiscipline('mma'));
    });
  });

  describe('grappling does NOT include mma-exclusive categories', () => {
    it('bjj_gi does not include cage_work', () => {
      expect(categoriesForDiscipline('bjj_gi')).not.toContain('cage_work');
    });

    it('bjj_gi does not include ground_and_pound', () => {
      expect(categoriesForDiscipline('bjj_gi')).not.toContain('ground_and_pound');
    });

    it('wrestling does not include striking-only categories', () => {
      const result = categoriesForDiscipline('wrestling');
      expect(result).not.toContain('punch');
      expect(result).not.toContain('kick');
      expect(result).not.toContain('knee');
      expect(result).not.toContain('elbow');
    });
  });
});

describe('CATEGORY_LABEL completeness', () => {
  it('contains every TechniqueCategory from TECHNIQUE_CATEGORIES enum', () => {
    for (const cat of TECHNIQUE_CATEGORIES) {
      expect(CATEGORY_LABEL).toHaveProperty(cat);
    }
  });

  it('each value is a non-empty string', () => {
    for (const cat of TECHNIQUE_CATEGORIES) {
      const label = CATEGORY_LABEL[cat];
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('exactly as many entries as TECHNIQUE_CATEGORIES', () => {
    expect(Object.keys(CATEGORY_LABEL)).toHaveLength(TECHNIQUE_CATEGORIES.length);
  });

  it('spot-check: submission → 서브미션', () => {
    expect(CATEGORY_LABEL.submission).toBe('서브미션');
  });

  it('spot-check: cage_work → 케이지워크', () => {
    expect(CATEGORY_LABEL.cage_work).toBe('케이지워크');
  });

  it('spot-check: ground_and_pound → 그라운드앤파운드', () => {
    expect(CATEGORY_LABEL.ground_and_pound).toBe('그라운드앤파운드');
  });

  it('spot-check: entry → 엔트리(셋업)', () => {
    expect(CATEGORY_LABEL.entry).toBe('엔트리(셋업)');
  });
});
