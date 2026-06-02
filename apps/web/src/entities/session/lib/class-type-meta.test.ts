import { describe, it, expect } from 'vitest';
import { CLASS_TYPES } from '@/shared/model/enums';
import { CLASS_TYPE_LABELS, intensityDots } from '@/entities/session/lib/class-type-meta';

describe('intensityDots', () => {
  it('returns exactly 5 booleans', () => {
    expect(intensityDots(3)).toHaveLength(5);
    expect(intensityDots(0)).toHaveLength(5);
    expect(intensityDots(5)).toHaveLength(5);
  });

  it('1 → [true, false, false, false, false]', () => {
    expect(intensityDots(1)).toEqual([true, false, false, false, false]);
  });

  it('2 → [true, true, false, false, false]', () => {
    expect(intensityDots(2)).toEqual([true, true, false, false, false]);
  });

  it('3 → [true, true, true, false, false]', () => {
    expect(intensityDots(3)).toEqual([true, true, true, false, false]);
  });

  it('4 → [true, true, true, true, false]', () => {
    expect(intensityDots(4)).toEqual([true, true, true, true, false]);
  });

  it('5 → all true', () => {
    expect(intensityDots(5)).toEqual([true, true, true, true, true]);
  });

  it('0 clamps to all false', () => {
    expect(intensityDots(0)).toEqual([false, false, false, false, false]);
  });

  it('negative value clamps to 0 → all false', () => {
    expect(intensityDots(-1)).toEqual([false, false, false, false, false]);
  });

  it('>5 clamps to 5 → all true', () => {
    expect(intensityDots(6)).toEqual([true, true, true, true, true]);
  });

  it('non-integer truncates toward zero: 2.9 → 2 filled', () => {
    expect(intensityDots(2.9)).toEqual([true, true, false, false, false]);
  });

  it('non-integer truncates toward zero: 1.1 → 1 filled', () => {
    expect(intensityDots(1.1)).toEqual([true, false, false, false, false]);
  });

  it('non-integer truncates toward zero: 0.99 → 0 filled (all false)', () => {
    expect(intensityDots(0.99)).toEqual([false, false, false, false, false]);
  });

  it('non-integer truncates toward zero: 4.5 → 4 filled', () => {
    expect(intensityDots(4.5)).toEqual([true, true, true, true, false]);
  });
});

describe('CLASS_TYPE_LABELS completeness', () => {
  it('contains every class type from CLASS_TYPES enum', () => {
    for (const ct of CLASS_TYPES) {
      expect(CLASS_TYPE_LABELS).toHaveProperty(ct);
    }
  });

  it('each value is a non-empty string', () => {
    for (const ct of CLASS_TYPES) {
      const label = CLASS_TYPE_LABELS[ct];
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('spot-check: sparring → 스파링', () => {
    expect(CLASS_TYPE_LABELS.sparring).toBe('스파링');
  });

  it('spot-check: technique → 기술', () => {
    expect(CLASS_TYPE_LABELS.technique).toBe('기술');
  });

  it('spot-check: competition → 시합', () => {
    expect(CLASS_TYPE_LABELS.competition).toBe('시합');
  });

  it('exactly as many entries as CLASS_TYPES', () => {
    expect(Object.keys(CLASS_TYPE_LABELS)).toHaveLength(CLASS_TYPES.length);
  });
});
