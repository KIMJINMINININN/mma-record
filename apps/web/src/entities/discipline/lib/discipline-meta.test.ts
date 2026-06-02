import { describe, it, expect } from 'vitest';
import { DISCIPLINES, STRIKING_STYLES, RANK_TRACKS } from '@/shared/model/enums';
import {
  DISCIPLINE_META,
  STRIKING_STYLE_LABEL,
  disciplineToRankTrack,
  usesBelt,
} from '@/entities/discipline/lib/discipline-meta';

describe('disciplineToRankTrack', () => {
  it('bjj_gi → bjj', () => {
    expect(disciplineToRankTrack('bjj_gi')).toBe('bjj');
  });

  it('bjj_nogi → bjj', () => {
    expect(disciplineToRankTrack('bjj_nogi')).toBe('bjj');
  });

  it('wrestling → wrestling', () => {
    expect(disciplineToRankTrack('wrestling')).toBe('wrestling');
  });

  it('striking → striking', () => {
    expect(disciplineToRankTrack('striking')).toBe('striking');
  });

  it('mma → mma', () => {
    expect(disciplineToRankTrack('mma')).toBe('mma');
  });

  it('all disciplines map to a valid RankTrack', () => {
    const validTracks = new Set<string>(RANK_TRACKS);
    for (const d of DISCIPLINES) {
      expect(validTracks.has(disciplineToRankTrack(d))).toBe(true);
    }
  });

  it('only bjj_gi and bjj_nogi map to bjj', () => {
    const bjjDisciplines = DISCIPLINES.filter(d => disciplineToRankTrack(d) === 'bjj');
    expect(bjjDisciplines).toEqual(['bjj_gi', 'bjj_nogi']);
  });
});

describe('usesBelt', () => {
  it('bjj_gi → true', () => {
    expect(usesBelt('bjj_gi')).toBe(true);
  });

  it('bjj_nogi → true', () => {
    expect(usesBelt('bjj_nogi')).toBe(true);
  });

  it('wrestling → false', () => {
    expect(usesBelt('wrestling')).toBe(false);
  });

  it('striking → false', () => {
    expect(usesBelt('striking')).toBe(false);
  });

  it('mma → false', () => {
    expect(usesBelt('mma')).toBe(false);
  });

  it('exactly two disciplines use belt', () => {
    const beltUsers = DISCIPLINES.filter(d => usesBelt(d));
    expect(beltUsers).toHaveLength(2);
    expect(beltUsers).toContain('bjj_gi');
    expect(beltUsers).toContain('bjj_nogi');
  });
});

describe('DISCIPLINE_META completeness', () => {
  it('contains every discipline from DISCIPLINES enum', () => {
    for (const d of DISCIPLINES) {
      expect(DISCIPLINE_META).toHaveProperty(d);
    }
  });

  it('each entry has required shape (code, label, color, colorDark, icon)', () => {
    for (const d of DISCIPLINES) {
      const meta = DISCIPLINE_META[d];
      expect(meta.code).toBe(d);
      expect(typeof meta.label).toBe('string');
      expect(meta.label.length).toBeGreaterThan(0);
      expect(typeof meta.color).toBe('string');
      expect(meta.color.length).toBeGreaterThan(0);
      expect(typeof meta.colorDark).toBe('string');
      expect(meta.colorDark.length).toBeGreaterThan(0);
      expect(typeof meta.icon).toBe('string');
      expect(meta.icon.length).toBeGreaterThan(0);
    }
  });

  it('spot-check: bjj_gi label is 주짓수 (기)', () => {
    expect(DISCIPLINE_META.bjj_gi.label).toBe('주짓수 (기)');
  });

  it('spot-check: mma label is MMA', () => {
    expect(DISCIPLINE_META.mma.label).toBe('MMA');
  });
});

describe('STRIKING_STYLE_LABEL completeness', () => {
  it('contains every striking style from STRIKING_STYLES enum', () => {
    for (const s of STRIKING_STYLES) {
      expect(STRIKING_STYLE_LABEL).toHaveProperty(s);
    }
  });

  it('each value is a non-empty string', () => {
    for (const s of STRIKING_STYLES) {
      const label = STRIKING_STYLE_LABEL[s];
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('spot-check: muay_thai → 무에타이', () => {
    expect(STRIKING_STYLE_LABEL.muay_thai).toBe('무에타이');
  });

  it('spot-check: boxing → 복싱', () => {
    expect(STRIKING_STYLE_LABEL.boxing).toBe('복싱');
  });
});
