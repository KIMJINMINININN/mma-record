import { describe, it, expect } from 'vitest';
import { logSessionInputSchema } from '@/features/log-session/model/log-session-schema';

// Zod v4 enforces strict RFC-4122: version nibble [1-8], variant nibble [89abAB].
const UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

/** Minimal valid input — only the two required fields. */
const MINIMAL = {
  trained_on: '2024-06-01',
  disciplines: ['bjj_gi' as const],
};

describe('logSessionInputSchema', () => {
  describe('minimal valid input', () => {
    it('accepts minimal required fields', () => {
      const result = logSessionInputSchema.safeParse(MINIMAL);
      expect(result.success).toBe(true);
    });

    it('defaults tag_names to []', () => {
      const result = logSessionInputSchema.safeParse(MINIMAL);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.tag_names).toEqual([]);
    });

    it('defaults techniques to []', () => {
      const result = logSessionInputSchema.safeParse(MINIMAL);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.techniques).toEqual([]);
    });

    it('defaults media to []', () => {
      const result = logSessionInputSchema.safeParse(MINIMAL);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.media).toEqual([]);
    });
  });

  describe('trained_on — date format', () => {
    it('accepts YYYY-MM-DD', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, trained_on: '2024-12-31' }).success).toBe(true);
    });

    it('rejects ISO datetime string (has time component)', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, trained_on: '2024-06-01T00:00:00Z' }).success).toBe(false);
    });

    it('rejects locale format MM/DD/YYYY', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, trained_on: '06/01/2024' }).success).toBe(false);
    });

    it('rejects empty string', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, trained_on: '' }).success).toBe(false);
    });
  });

  describe('disciplines', () => {
    it('accepts all valid discipline values', () => {
      const result = logSessionInputSchema.safeParse({
        ...MINIMAL,
        disciplines: ['bjj_gi', 'bjj_nogi', 'wrestling', 'striking', 'mma'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty disciplines array', () => {
      const result = logSessionInputSchema.safeParse({ ...MINIMAL, disciplines: [] });
      expect(result.success).toBe(false);
    });

    it('rejects invalid discipline value', () => {
      const result = logSessionInputSchema.safeParse({ ...MINIMAL, disciplines: ['karate'] });
      expect(result.success).toBe(false);
    });
  });

  describe('duration_min — 0..1440', () => {
    it('accepts boundary 0', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, duration_min: 0 }).success).toBe(true);
    });

    it('accepts boundary 1440', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, duration_min: 1440 }).success).toBe(true);
    });

    it('rejects -1 (below min)', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, duration_min: -1 }).success).toBe(false);
    });

    it('rejects 1441 (above max)', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, duration_min: 1441 }).success).toBe(false);
    });

    it('rejects non-integer 60.5', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, duration_min: 60.5 }).success).toBe(false);
    });
  });

  describe('intensity — 1..5', () => {
    it('accepts boundary 1', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, intensity: 1 }).success).toBe(true);
    });

    it('accepts boundary 5', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, intensity: 5 }).success).toBe(true);
    });

    it('rejects 0 (below min)', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, intensity: 0 }).success).toBe(false);
    });

    it('rejects 6 (above max)', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, intensity: 6 }).success).toBe(false);
    });
  });

  describe('rounds — 0..99', () => {
    it('accepts boundary 0', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, rounds: 0 }).success).toBe(true);
    });

    it('accepts boundary 99', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, rounds: 99 }).success).toBe(true);
    });

    it('rejects -1 (below min)', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, rounds: -1 }).success).toBe(false);
    });

    it('rejects 100 (above max)', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, rounds: 100 }).success).toBe(false);
    });
  });

  describe('rating — 1..5', () => {
    it('accepts boundary 1', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, rating: 1 }).success).toBe(true);
    });

    it('accepts boundary 5', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, rating: 5 }).success).toBe(true);
    });

    it('rejects 0 (below min)', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, rating: 0 }).success).toBe(false);
    });

    it('rejects 6 (above max)', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, rating: 6 }).success).toBe(false);
    });
  });

  describe('string max lengths', () => {
    it('accepts gym at max length 120', () => {
      const result = logSessionInputSchema.safeParse({ ...MINIMAL, gym: 'a'.repeat(120) });
      expect(result.success).toBe(true);
    });

    it('rejects gym over 120 chars', () => {
      const result = logSessionInputSchema.safeParse({ ...MINIMAL, gym: 'a'.repeat(121) });
      expect(result.success).toBe(false);
    });

    it('accepts partners at max length 200', () => {
      const result = logSessionInputSchema.safeParse({ ...MINIMAL, partners: 'a'.repeat(200) });
      expect(result.success).toBe(true);
    });

    it('rejects partners over 200 chars', () => {
      const result = logSessionInputSchema.safeParse({ ...MINIMAL, partners: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('accepts memo_md at max length 5000', () => {
      const result = logSessionInputSchema.safeParse({ ...MINIMAL, memo_md: 'a'.repeat(5000) });
      expect(result.success).toBe(true);
    });

    it('rejects memo_md over 5000 chars', () => {
      const result = logSessionInputSchema.safeParse({ ...MINIMAL, memo_md: 'a'.repeat(5001) });
      expect(result.success).toBe(false);
    });
  });

  describe('trim applied to string fields', () => {
    it('trims leading/trailing whitespace from gym', () => {
      const result = logSessionInputSchema.safeParse({ ...MINIMAL, gym: '  My Gym  ' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.gym).toBe('My Gym');
    });

    it('trims leading/trailing whitespace from partners', () => {
      const result = logSessionInputSchema.safeParse({ ...MINIMAL, partners: '  Alice, Bob  ' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.partners).toBe('Alice, Bob');
    });

    it('trims leading/trailing whitespace from memo_md', () => {
      const result = logSessionInputSchema.safeParse({ ...MINIMAL, memo_md: '  notes  ' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.memo_md).toBe('notes');
    });

    it('trims tag names inside tag_names array', () => {
      const result = logSessionInputSchema.safeParse({ ...MINIMAL, tag_names: ['  sweep  ', '  pass'] });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.tag_names).toEqual(['sweep', 'pass']);
    });

    it('rejects tag_names entries that are empty after trim', () => {
      // z.string().trim().min(1) — blank string becomes '' after trim → fails min(1)
      const result = logSessionInputSchema.safeParse({ ...MINIMAL, tag_names: ['   '] });
      expect(result.success).toBe(false);
    });
  });

  describe('class_type enum', () => {
    it('accepts valid class_type', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, class_type: 'sparring' }).success).toBe(true);
    });

    it('rejects invalid class_type', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, class_type: 'yoga' }).success).toBe(false);
    });

    it('accepts null class_type', () => {
      expect(logSessionInputSchema.safeParse({ ...MINIMAL, class_type: null }).success).toBe(true);
    });
  });

  describe('techniques and media arrays', () => {
    it('accepts valid technique entry', () => {
      const result = logSessionInputSchema.safeParse({
        ...MINIMAL,
        techniques: [{ technique_id: UUID, day_memo_md: null }],
      });
      expect(result.success).toBe(true);
    });

    it('rejects technique entry with invalid uuid', () => {
      const result = logSessionInputSchema.safeParse({
        ...MINIMAL,
        techniques: [{ technique_id: 'not-a-uuid', day_memo_md: null }],
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid media entry', () => {
      const result = logSessionInputSchema.safeParse({
        ...MINIMAL,
        media: [{ media_id: UUID }],
      });
      expect(result.success).toBe(true);
    });
  });
});
