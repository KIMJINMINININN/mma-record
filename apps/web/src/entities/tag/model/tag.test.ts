import { describe, it, expect } from 'vitest';
import { taggableSchema, tagSchema, tagInsertSchema } from '@/entities/tag/model/tag';

// Zod v4 enforces strict RFC-4122: version nibble [1-8], variant nibble [89abAB].
const UUID_A = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const UUID_B = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const UUID_C = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const UUID_D = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const TIMESTAMP = '2024-01-15T10:30:00Z';

describe('taggableSchema (XOR: exactly one of session_id / technique_id)', () => {
  const base = { id: UUID_A, tag_id: UUID_B };

  it('accepts when only session_id is set', () => {
    const result = taggableSchema.safeParse({
      ...base,
      session_id: UUID_C,
      technique_id: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts when only technique_id is set', () => {
    const result = taggableSchema.safeParse({
      ...base,
      session_id: null,
      technique_id: UUID_C,
    });
    expect(result.success).toBe(true);
  });

  it('rejects when both session_id and technique_id are set', () => {
    const result = taggableSchema.safeParse({
      ...base,
      session_id: UUID_C,
      technique_id: UUID_D,
    });
    expect(result.success).toBe(false);
  });

  it('rejects when both are null (neither set)', () => {
    const result = taggableSchema.safeParse({
      ...base,
      session_id: null,
      technique_id: null,
    });
    expect(result.success).toBe(false);
  });

  it('error path for both-null points to session_id', () => {
    const result = taggableSchema.safeParse({
      ...base,
      session_id: null,
      technique_id: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('session_id');
    }
  });

  it('error path for both-set points to technique_id', () => {
    const result = taggableSchema.safeParse({
      ...base,
      session_id: UUID_C,
      technique_id: UUID_D,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('technique_id');
    }
  });
});

describe('tagSchema', () => {
  const valid = {
    id: UUID_A,
    user_id: UUID_B,
    name: 'guard-work',
    color: '#ff5733',
    created_at: TIMESTAMP,
  };

  it('accepts a complete valid tag row', () => {
    expect(tagSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts null color', () => {
    expect(tagSchema.safeParse({ ...valid, color: null }).success).toBe(true);
  });

  it('rejects non-UUID id', () => {
    expect(tagSchema.safeParse({ ...valid, id: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects invalid created_at (no offset)', () => {
    expect(tagSchema.safeParse({ ...valid, created_at: '2024-01-15T10:30:00' }).success).toBe(false);
  });
});

describe('tagInsertSchema (omits id / user_id / created_at)', () => {
  it('accepts minimal insert input', () => {
    const result = tagInsertSchema.safeParse({ name: 'new-tag', color: null });
    expect(result.success).toBe(true);
  });

  it('rejects extra server-managed fields (they are stripped by omit, not rejected — just ensure they are absent from output)', () => {
    // tagInsertSchema.omit means those keys simply don't exist in schema,
    // extra keys are stripped in strip mode (zod default). parse succeeds.
    const result = tagInsertSchema.safeParse({
      name: 'new-tag',
      color: null,
      id: UUID_A,         // will be stripped
      user_id: UUID_B,    // will be stripped
      created_at: TIMESTAMP, // will be stripped
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // Confirm stripped fields don't appear in output
      expect((result.data as Record<string, unknown>).id).toBeUndefined();
      expect((result.data as Record<string, unknown>).user_id).toBeUndefined();
      expect((result.data as Record<string, unknown>).created_at).toBeUndefined();
    }
  });
});
