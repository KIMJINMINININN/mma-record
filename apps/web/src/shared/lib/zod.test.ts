import { describe, it, expect } from 'vitest';
import { isoTimestamp } from '@/shared/lib/zod';

describe('isoTimestamp', () => {
  describe('valid inputs', () => {
    it('accepts UTC offset Z', () => {
      const result = isoTimestamp.safeParse('2024-01-15T10:30:00Z');
      expect(result.success).toBe(true);
    });

    it('accepts positive numeric offset +09:00', () => {
      const result = isoTimestamp.safeParse('2024-01-15T10:30:00+09:00');
      expect(result.success).toBe(true);
    });

    it('accepts negative numeric offset -05:00', () => {
      const result = isoTimestamp.safeParse('2024-06-01T00:00:00-05:00');
      expect(result.success).toBe(true);
    });

    it('accepts millisecond precision with Z', () => {
      const result = isoTimestamp.safeParse('2024-01-15T10:30:00.123Z');
      expect(result.success).toBe(true);
    });

    it('accepts millisecond precision with offset', () => {
      const result = isoTimestamp.safeParse('2024-01-15T10:30:00.456+05:30');
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs — missing offset', () => {
    it('rejects plain date-time without offset (no Z, no +HH:MM)', () => {
      const result = isoTimestamp.safeParse('2024-01-15T10:30:00');
      expect(result.success).toBe(false);
    });

    it('rejects date only (no time, no offset)', () => {
      const result = isoTimestamp.safeParse('2024-01-15');
      expect(result.success).toBe(false);
    });
  });

  describe('invalid inputs — garbage', () => {
    it('rejects empty string', () => {
      const result = isoTimestamp.safeParse('');
      expect(result.success).toBe(false);
    });

    it('rejects arbitrary string', () => {
      const result = isoTimestamp.safeParse('not-a-timestamp');
      expect(result.success).toBe(false);
    });

    it('rejects numeric value', () => {
      const result = isoTimestamp.safeParse(1234567890);
      expect(result.success).toBe(false);
    });

    it('rejects null', () => {
      const result = isoTimestamp.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});
