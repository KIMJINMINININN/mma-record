import { describe, it, expect } from 'vitest';
import { BELTS } from '@/shared/model/enums';
import { BELT_META, romanStripes, stripeColorFor, beltFullLabel } from '@/entities/rank/lib/belt-meta';

describe('romanStripes', () => {
  it('0 → empty string', () => {
    expect(romanStripes(0)).toBe('');
  });

  it('1 → I', () => {
    expect(romanStripes(1)).toBe('I');
  });

  it('2 → II', () => {
    expect(romanStripes(2)).toBe('II');
  });

  it('3 → III', () => {
    expect(romanStripes(3)).toBe('III');
  });

  it('4 → IV', () => {
    expect(romanStripes(4)).toBe('IV');
  });

  it('clamps -1 to 0 → empty string', () => {
    expect(romanStripes(-1)).toBe('');
  });

  it('clamps 5 to 4 → IV', () => {
    expect(romanStripes(5)).toBe('IV');
  });

  it('clamps 99 to 4 → IV', () => {
    expect(romanStripes(99)).toBe('IV');
  });
});

describe('stripeColorFor', () => {
  it('white → onwhite CSS var', () => {
    expect(stripeColorFor('white')).toBe('var(--color-belt-stripe-onwhite)');
  });

  it('black → onblack CSS var', () => {
    expect(stripeColorFor('black')).toBe('var(--color-belt-stripe-onblack)');
  });

  it('blue → default stripe CSS var', () => {
    expect(stripeColorFor('blue')).toBe('var(--color-belt-stripe)');
  });

  it('purple → default stripe CSS var', () => {
    expect(stripeColorFor('purple')).toBe('var(--color-belt-stripe)');
  });

  it('brown → default stripe CSS var', () => {
    expect(stripeColorFor('brown')).toBe('var(--color-belt-stripe)');
  });
});

describe('beltFullLabel', () => {
  it('belt only (no stripes arg) → just label', () => {
    expect(beltFullLabel('blue')).toBe('블루');
  });

  it('belt with stripes=0 → just label', () => {
    expect(beltFullLabel('blue', 0)).toBe('블루');
  });

  it('belt with stripes=2 → label · II', () => {
    expect(beltFullLabel('blue', 2)).toBe('블루 · II');
  });

  it('white belt stripes=1 → 흰띠 · I', () => {
    expect(beltFullLabel('white', 1)).toBe('흰띠 · I');
  });

  it('black belt stripes=4 → 블랙 · IV', () => {
    expect(beltFullLabel('black', 4)).toBe('블랙 · IV');
  });

  it('purple belt stripes=3 → 퍼플 · III', () => {
    expect(beltFullLabel('purple', 3)).toBe('퍼플 · III');
  });

  it('brown belt stripes=0 → 브라운 (no dot)', () => {
    expect(beltFullLabel('brown', 0)).toBe('브라운');
  });
});

describe('BELT_META completeness', () => {
  it('contains every belt from BELTS enum', () => {
    for (const belt of BELTS) {
      expect(BELT_META).toHaveProperty(belt);
    }
  });

  it('each entry has label, bar, barDark', () => {
    for (const belt of BELTS) {
      const meta = BELT_META[belt];
      expect(typeof meta.label).toBe('string');
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.bar).toMatch(/^var\(/);
      expect(meta.barDark).toMatch(/^var\(/);
    }
  });

  it('white bar and barDark are the same (no dark variant)', () => {
    expect(BELT_META.white.bar).toBe(BELT_META.white.barDark);
  });

  it('blue bar and barDark are the same', () => {
    expect(BELT_META.blue.bar).toBe(BELT_META.blue.barDark);
  });

  it('black bar and barDark are the same', () => {
    expect(BELT_META.black.bar).toBe(BELT_META.black.barDark);
  });

  it('purple has a distinct dark variant', () => {
    expect(BELT_META.purple.bar).not.toBe(BELT_META.purple.barDark);
  });

  it('brown has a distinct dark variant', () => {
    expect(BELT_META.brown.bar).not.toBe(BELT_META.brown.barDark);
  });
});
