import { describe, it, expect } from 'vitest';
import { LEVELS } from '@/shared/model/enums';
import type { Level } from '@/shared/model/enums';
import { LEVEL_META } from '@/entities/technique/lib/level-meta';

const HEX = /^#[0-9a-fA-F]{6}$/;

describe('LEVEL_META completeness', () => {
  it('contains every Level from LEVELS enum', () => {
    for (const lv of LEVELS) {
      expect(LEVEL_META).toHaveProperty(lv);
    }
  });

  it('exactly as many entries as LEVELS', () => {
    expect(Object.keys(LEVEL_META)).toHaveLength(LEVELS.length);
  });

  it('Korean labels are 입문 / 중급 / 고급', () => {
    expect(LEVEL_META.beginner.label).toBe('입문');
    expect(LEVEL_META.intermediate.label).toBe('중급');
    expect(LEVEL_META.advanced.label).toBe('고급');
  });

  it('every entry has 6-digit hex bg/bgDark/fg/fgDark', () => {
    for (const lv of LEVELS) {
      const m = LEVEL_META[lv];
      expect(m.bg).toMatch(HEX);
      expect(m.bgDark).toMatch(HEX);
      expect(m.fg).toMatch(HEX);
      expect(m.fgDark).toMatch(HEX);
    }
  });
});

describe('LEVEL_META color progression', () => {
  it('each level has a distinct light-surface fill (bg)', () => {
    const bgs = LEVELS.map((lv) => LEVEL_META[lv].bg);
    expect(new Set(bgs).size).toBe(LEVELS.length);
  });

  it('each level has a distinct dark-surface fill (bgDark)', () => {
    const bgs = LEVELS.map((lv: Level) => LEVEL_META[lv].bgDark);
    expect(new Set(bgs).size).toBe(LEVELS.length);
  });

  it('fg differs from bg within each level (text is not invisible on its own fill)', () => {
    for (const lv of LEVELS) {
      const m = LEVEL_META[lv];
      expect(m.fg).not.toBe(m.bg);
      expect(m.fgDark).not.toBe(m.bgDark);
    }
  });
});
