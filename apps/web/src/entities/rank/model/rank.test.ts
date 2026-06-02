import { describe, it, expect } from 'vitest';
import { userRankUpsertSchema } from '@/entities/rank/model/rank';

/** Minimal valid upsert payload (bjj track — belt and stripes make sense). */
const VALID_BJJ = {
  track: 'bjj' as const,
  belt: 'blue' as const,
  stripes: 2,
  level: null,
  visibility: 'private' as const,
};

describe('userRankUpsertSchema', () => {
  describe('valid inputs', () => {
    it('accepts a complete bjj upsert payload', () => {
      expect(userRankUpsertSchema.safeParse(VALID_BJJ).success).toBe(true);
    });

    it('accepts non-bjj track with null belt and null stripes', () => {
      const result = userRankUpsertSchema.safeParse({
        track: 'wrestling',
        belt: null,
        stripes: null,
        level: '중급',
        visibility: 'public',
      });
      expect(result.success).toBe(true);
    });

    it('accepts null belt (nullable)', () => {
      const result = userRankUpsertSchema.safeParse({ ...VALID_BJJ, belt: null });
      expect(result.success).toBe(true);
    });

    it('accepts null level (nullable)', () => {
      const result = userRankUpsertSchema.safeParse({ ...VALID_BJJ, level: null });
      expect(result.success).toBe(true);
    });

    it('accepts null stripes (nullable)', () => {
      const result = userRankUpsertSchema.safeParse({ ...VALID_BJJ, stripes: null });
      expect(result.success).toBe(true);
    });
  });

  describe('stripes — 0..4 boundary', () => {
    it('accepts stripe boundary 0', () => {
      expect(userRankUpsertSchema.safeParse({ ...VALID_BJJ, stripes: 0 }).success).toBe(true);
    });

    it('accepts stripe boundary 4', () => {
      expect(userRankUpsertSchema.safeParse({ ...VALID_BJJ, stripes: 4 }).success).toBe(true);
    });

    it('rejects stripes = 5 (above max)', () => {
      expect(userRankUpsertSchema.safeParse({ ...VALID_BJJ, stripes: 5 }).success).toBe(false);
    });

    it('rejects stripes = -1 (below min)', () => {
      expect(userRankUpsertSchema.safeParse({ ...VALID_BJJ, stripes: -1 }).success).toBe(false);
    });

    it('rejects non-integer stripes (1.5)', () => {
      expect(userRankUpsertSchema.safeParse({ ...VALID_BJJ, stripes: 1.5 }).success).toBe(false);
    });
  });

  describe('track enum', () => {
    it('accepts all valid tracks', () => {
      for (const track of ['bjj', 'wrestling', 'striking', 'mma'] as const) {
        expect(userRankUpsertSchema.safeParse({ ...VALID_BJJ, track }).success).toBe(true);
      }
    });

    it('rejects invalid track value', () => {
      expect(userRankUpsertSchema.safeParse({ ...VALID_BJJ, track: 'judo' }).success).toBe(false);
    });
  });

  describe('belt enum', () => {
    it('accepts all valid belt values', () => {
      for (const belt of ['white', 'blue', 'purple', 'brown', 'black'] as const) {
        expect(userRankUpsertSchema.safeParse({ ...VALID_BJJ, belt }).success).toBe(true);
      }
    });

    it('rejects invalid belt value', () => {
      expect(userRankUpsertSchema.safeParse({ ...VALID_BJJ, belt: 'red' as string }).success).toBe(false);
    });
  });

  describe('visibility enum', () => {
    it('accepts all valid visibility values', () => {
      for (const visibility of ['private', 'shared', 'public'] as const) {
        expect(userRankUpsertSchema.safeParse({ ...VALID_BJJ, visibility }).success).toBe(true);
      }
    });

    it('rejects invalid visibility value', () => {
      expect(userRankUpsertSchema.safeParse({ ...VALID_BJJ, visibility: 'friends' as string }).success).toBe(false);
    });
  });

  describe('server-managed fields are omitted from schema', () => {
    it('strips id if provided (omitted from upsert schema)', () => {
      const result = userRankUpsertSchema.safeParse({
        ...VALID_BJJ,
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).id).toBeUndefined();
      }
    });

    it('strips user_id if provided', () => {
      const result = userRankUpsertSchema.safeParse({
        ...VALID_BJJ,
        user_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).user_id).toBeUndefined();
      }
    });
  });
});
