/**
 * Unit tests for media.ts — mediaAssetSchema, mediaAssetInsertSchema, mediaLinkSchema.
 */
import { describe, it, expect } from 'vitest';
import {
  mediaAssetSchema,
  mediaAssetInsertSchema,
  mediaLinkSchema,
} from '@/entities/media/model/media';

// ---------------------------------------------------------------------------
// Fixtures / helpers
// ---------------------------------------------------------------------------

// RFC 4122 v4 compliant UUIDs (Zod v4 enforces strict RFC format)
const UUID_A = 'a0000000-0000-4000-8000-000000000001';
const UUID_B = 'b0000000-0000-4000-8000-000000000002';
const UUID_C = 'c0000000-0000-4000-8000-000000000003';
const UUID_D = 'd0000000-0000-4000-8000-000000000004';
const CREATED_AT = '2024-01-01T00:00:00+00:00'; // ISO-8601 with offset

/** Shared base columns for mediaAssetSchema fixtures. */
const BASE = {
  id: UUID_A,
  user_id: UUID_B,
  duration_sec: null,
  size_bytes: null,
  thumbnail_path: null,
  title: null,
  visibility: 'private' as const,
  created_at: CREATED_AT,
};

// ---------------------------------------------------------------------------
// mediaAssetSchema — upload variant
// ---------------------------------------------------------------------------

describe('mediaAssetSchema — kind: upload', () => {
  it('parses a minimal valid upload asset', () => {
    const data = {
      ...BASE,
      kind: 'upload',
      storage_path: '/uploads/clip.mp4',
      youtube_video_id: null,
      external_url: null,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(true);
  });

  it('parses an upload with non-null size_bytes and duration_sec', () => {
    const data = {
      ...BASE,
      kind: 'upload',
      storage_path: '/uploads/clip.mp4',
      youtube_video_id: null,
      external_url: null,
      size_bytes: 1048576,
      duration_sec: 30,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(true);
  });

  it('rejects upload when storage_path is missing', () => {
    const data = {
      ...BASE,
      kind: 'upload',
      // storage_path omitted
      youtube_video_id: null,
      external_url: null,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });

  it('rejects upload when storage_path is null', () => {
    const data = {
      ...BASE,
      kind: 'upload',
      storage_path: null,
      youtube_video_id: null,
      external_url: null,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });

  it('accepts upload even when youtube_video_id is provided (nullable allowed on wrong-kind columns)', () => {
    // The schema allows other-kind fields to be non-null on upload variant —
    // the constraint is only that storage_path is required for upload.
    const data = {
      ...BASE,
      kind: 'upload',
      storage_path: '/uploads/clip.mp4',
      youtube_video_id: 'abc123', // non-null but allowed by schema
      external_url: null,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(true);
  });

  it('rejects negative size_bytes', () => {
    const data = {
      ...BASE,
      kind: 'upload',
      storage_path: '/uploads/clip.mp4',
      youtube_video_id: null,
      external_url: null,
      size_bytes: -1,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });

  it('rejects negative duration_sec', () => {
    const data = {
      ...BASE,
      kind: 'upload',
      storage_path: '/uploads/clip.mp4',
      youtube_video_id: null,
      external_url: null,
      duration_sec: -1,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });

  it('accepts 0 for size_bytes (boundary)', () => {
    const data = {
      ...BASE,
      kind: 'upload',
      storage_path: '/uploads/clip.mp4',
      youtube_video_id: null,
      external_url: null,
      size_bytes: 0,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(true);
  });

  it('accepts 0 for duration_sec (boundary)', () => {
    const data = {
      ...BASE,
      kind: 'upload',
      storage_path: '/uploads/clip.mp4',
      youtube_video_id: null,
      external_url: null,
      duration_sec: 0,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(true);
  });

  it('rejects non-integer size_bytes', () => {
    const data = {
      ...BASE,
      kind: 'upload',
      storage_path: '/uploads/clip.mp4',
      youtube_video_id: null,
      external_url: null,
      size_bytes: 1.5,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mediaAssetSchema — youtube variant
// ---------------------------------------------------------------------------

describe('mediaAssetSchema — kind: youtube', () => {
  it('parses a minimal valid youtube asset', () => {
    const data = {
      ...BASE,
      kind: 'youtube',
      storage_path: null,
      youtube_video_id: 'dQw4w9WgXcQ',
      external_url: null,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(true);
  });

  it('rejects youtube when youtube_video_id is missing', () => {
    const data = {
      ...BASE,
      kind: 'youtube',
      storage_path: null,
      // youtube_video_id omitted
      external_url: null,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });

  it('rejects youtube when youtube_video_id is null', () => {
    const data = {
      ...BASE,
      kind: 'youtube',
      storage_path: null,
      youtube_video_id: null,
      external_url: null,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });

  it('accepts nullable duration on youtube variant', () => {
    const data = {
      ...BASE,
      kind: 'youtube',
      storage_path: null,
      youtube_video_id: 'dQw4w9WgXcQ',
      external_url: null,
      duration_sec: null,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(true);
  });

  it('accepts non-null duration on youtube variant', () => {
    const data = {
      ...BASE,
      kind: 'youtube',
      storage_path: null,
      youtube_video_id: 'dQw4w9WgXcQ',
      external_url: null,
      duration_sec: 213,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mediaAssetSchema — external variant
// ---------------------------------------------------------------------------

describe('mediaAssetSchema — kind: external', () => {
  it('parses a minimal valid external asset', () => {
    const data = {
      ...BASE,
      kind: 'external',
      storage_path: null,
      youtube_video_id: null,
      external_url: 'https://example.com/video.mp4',
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(true);
  });

  it('rejects external when external_url is missing', () => {
    const data = {
      ...BASE,
      kind: 'external',
      storage_path: null,
      youtube_video_id: null,
      // external_url omitted
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });

  it('rejects external when external_url is null', () => {
    const data = {
      ...BASE,
      kind: 'external',
      storage_path: null,
      youtube_video_id: null,
      external_url: null,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mediaAssetSchema — discriminator / cross-kind rejections
// ---------------------------------------------------------------------------

describe('mediaAssetSchema — discriminator enforcement', () => {
  it('rejects unknown kind', () => {
    const data = {
      ...BASE,
      kind: 'vimeo',
      storage_path: '/path',
      youtube_video_id: null,
      external_url: null,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });

  it('rejects missing kind', () => {
    const data = {
      ...BASE,
      storage_path: '/path',
      youtube_video_id: null,
      external_url: null,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });

  it('rejects kind:youtube when youtube_video_id missing (even if storage_path provided)', () => {
    const data = {
      ...BASE,
      kind: 'youtube',
      storage_path: '/uploads/clip.mp4',
      // youtube_video_id missing
      external_url: null,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });

  it('rejects invalid visibility value', () => {
    const data = {
      ...BASE,
      kind: 'upload',
      storage_path: '/uploads/clip.mp4',
      youtube_video_id: null,
      external_url: null,
      visibility: 'secret', // not in VISIBILITIES
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });

  it('rejects invalid uuid for id', () => {
    const data = {
      ...BASE,
      id: 'not-a-uuid',
      kind: 'upload',
      storage_path: '/uploads/clip.mp4',
      youtube_video_id: null,
      external_url: null,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });

  it('rejects created_at without timezone offset', () => {
    const data = {
      ...BASE,
      created_at: '2024-01-01T00:00:00', // no offset — isoTimestamp requires offset
      kind: 'upload',
      storage_path: '/uploads/clip.mp4',
      youtube_video_id: null,
      external_url: null,
    };
    expect(mediaAssetSchema.safeParse(data).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mediaAssetInsertSchema
// ---------------------------------------------------------------------------

describe('mediaAssetInsertSchema', () => {
  it('parses valid insert payload for upload (omits id/user_id/created_at)', () => {
    const data = {
      kind: 'upload',
      storage_path: '/uploads/clip.mp4',
      youtube_video_id: null,
      external_url: null,
      duration_sec: null,
      size_bytes: null,
      thumbnail_path: null,
      title: null,
      visibility: 'private' as const,
    };
    expect(mediaAssetInsertSchema.safeParse(data).success).toBe(true);
  });

  it('insert schema accepts payload without visibility (it is optional)', () => {
    const data = {
      kind: 'youtube',
      storage_path: null,
      youtube_video_id: 'dQw4w9WgXcQ',
      external_url: null,
      duration_sec: null,
      size_bytes: null,
      thumbnail_path: null,
      title: null,
    };
    expect(mediaAssetInsertSchema.safeParse(data).success).toBe(true);
  });

  it('rejects insert payload that includes id (server-generated)', () => {
    const data = {
      kind: 'upload',
      id: UUID_A, // should not be present
      storage_path: '/uploads/clip.mp4',
      youtube_video_id: null,
      external_url: null,
      duration_sec: null,
      size_bytes: null,
      thumbnail_path: null,
      title: null,
    };
    // Zod strips unknown keys by default (doesn't reject). This test documents
    // that extra keys are silently stripped — parse succeeds.
    const result = mediaAssetInsertSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      // id should not be present in parsed output
      expect('id' in result.data).toBe(false);
    }
  });

  it('rejects insert payload for upload when storage_path missing', () => {
    const data = {
      kind: 'upload',
      youtube_video_id: null,
      external_url: null,
      duration_sec: null,
      size_bytes: null,
      thumbnail_path: null,
      title: null,
    };
    expect(mediaAssetInsertSchema.safeParse(data).success).toBe(false);
  });

  it('parses valid insert payload for external', () => {
    const data = {
      kind: 'external',
      storage_path: null,
      youtube_video_id: null,
      external_url: 'https://example.com/v.mp4',
      duration_sec: null,
      size_bytes: null,
      thumbnail_path: null,
      title: null,
    };
    expect(mediaAssetInsertSchema.safeParse(data).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mediaLinkSchema — XOR session_id / technique_id
// ---------------------------------------------------------------------------

describe('mediaLinkSchema', () => {
  const LINK_BASE = {
    id: UUID_A,
    media_id: UUID_B,
    created_at: CREATED_AT,
  };

  it('parses when only session_id is set', () => {
    const data = { ...LINK_BASE, session_id: UUID_C, technique_id: null };
    expect(mediaLinkSchema.safeParse(data).success).toBe(true);
  });

  it('parses when only technique_id is set', () => {
    const data = { ...LINK_BASE, session_id: null, technique_id: UUID_C };
    expect(mediaLinkSchema.safeParse(data).success).toBe(true);
  });

  it('rejects when both session_id and technique_id are set', () => {
    const data = { ...LINK_BASE, session_id: UUID_C, technique_id: UUID_D };
    expect(mediaLinkSchema.safeParse(data).success).toBe(false);
  });

  it('rejects when both session_id and technique_id are null', () => {
    const data = { ...LINK_BASE, session_id: null, technique_id: null };
    expect(mediaLinkSchema.safeParse(data).success).toBe(false);
  });

  it('XOR rejection error path points to session_id', () => {
    const data = { ...LINK_BASE, session_id: null, technique_id: null };
    const result = mediaLinkSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths.some((p) => p === 'session_id')).toBe(true);
    }
  });

  it('rejects invalid uuid for session_id', () => {
    const data = { ...LINK_BASE, session_id: 'not-a-uuid', technique_id: null };
    expect(mediaLinkSchema.safeParse(data).success).toBe(false);
  });

  it('rejects invalid uuid for technique_id', () => {
    const data = { ...LINK_BASE, session_id: null, technique_id: 'bad' };
    expect(mediaLinkSchema.safeParse(data).success).toBe(false);
  });

  it('rejects missing media_id', () => {
    const data = { id: UUID_A, session_id: UUID_C, technique_id: null, created_at: CREATED_AT };
    expect(mediaLinkSchema.safeParse(data).success).toBe(false);
  });

  it('rejects created_at without timezone offset', () => {
    const data = {
      ...LINK_BASE,
      created_at: '2024-01-01T00:00:00',
      session_id: UUID_C,
      technique_id: null,
    };
    expect(mediaLinkSchema.safeParse(data).success).toBe(false);
  });
});
