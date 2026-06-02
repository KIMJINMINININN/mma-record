/**
 * Unit tests for media-draft.ts — validateUploadFileSync + validateDuration.
 */
import { describe, it, expect } from 'vitest';
import {
  validateUploadFileSync,
  validateDuration,
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_DURATION_SEC,
  ALLOWED_UPLOAD_MIME,
} from '@/features/media-upload/model/media-draft';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a real File with the given MIME and byte-length.
 * For sizes that would be impractical to allocate we use a File-like stub
 * (plain object cast as File), since validateUploadFileSync only reads
 * `file.type` and `file.size`.
 */
function makeFile(sizeBytes: number, type: string): File {
  // For small sizes use a real File so the test truly exercises the global.
  if (sizeBytes <= 64) {
    const bytes = new Uint8Array(sizeBytes);
    return new File([bytes], 'test.file', { type });
  }
  // For large / boundary sizes create a lightweight stub.
  return { size: sizeBytes, type } as unknown as File;
}

const VALID_MIME = ALLOWED_UPLOAD_MIME[0]; // 'video/mp4'
const VALID_MIME_MOV = ALLOWED_UPLOAD_MIME[1]; // 'video/quicktime'
const INVALID_MIME = 'image/jpeg';

// ---------------------------------------------------------------------------
// validateUploadFileSync
// ---------------------------------------------------------------------------

describe('validateUploadFileSync', () => {
  describe('MIME validation', () => {
    it('returns null for allowed MIME video/mp4 within size limit', () => {
      const file = makeFile(1024, VALID_MIME);
      expect(validateUploadFileSync(file)).toBeNull();
    });

    it('returns null for allowed MIME video/quicktime within size limit', () => {
      const file = makeFile(1024, VALID_MIME_MOV);
      expect(validateUploadFileSync(file)).toBeNull();
    });

    it('returns {reason:"mime"} for disallowed MIME image/jpeg', () => {
      const file = makeFile(1024, INVALID_MIME);
      const result = validateUploadFileSync(file);
      expect(result).not.toBeNull();
      expect(result?.reason).toBe('mime');
    });

    it('returns {reason:"mime"} for disallowed MIME video/webm', () => {
      const file = makeFile(1024, 'video/webm');
      const result = validateUploadFileSync(file);
      expect(result).not.toBeNull();
      expect(result?.reason).toBe('mime');
    });

    it('returns {reason:"mime"} for empty type string', () => {
      const file = makeFile(1024, '');
      const result = validateUploadFileSync(file);
      expect(result).not.toBeNull();
      expect(result?.reason).toBe('mime');
    });

    it('MIME error carries a non-empty message string', () => {
      const file = makeFile(1024, INVALID_MIME);
      const result = validateUploadFileSync(file);
      expect(typeof result?.message).toBe('string');
      expect(result!.message.length).toBeGreaterThan(0);
    });
  });

  describe('size validation', () => {
    it('returns null when size equals exactly UPLOAD_MAX_BYTES (boundary — at limit)', () => {
      const file = makeFile(UPLOAD_MAX_BYTES, VALID_MIME);
      expect(validateUploadFileSync(file)).toBeNull();
    });

    it('returns null when size is 1 byte below UPLOAD_MAX_BYTES', () => {
      const file = makeFile(UPLOAD_MAX_BYTES - 1, VALID_MIME);
      expect(validateUploadFileSync(file)).toBeNull();
    });

    it('returns {reason:"size"} when size is 1 byte above UPLOAD_MAX_BYTES', () => {
      const file = makeFile(UPLOAD_MAX_BYTES + 1, VALID_MIME);
      const result = validateUploadFileSync(file);
      expect(result).not.toBeNull();
      expect(result?.reason).toBe('size');
    });

    it('returns {reason:"size"} for a file substantially over the limit', () => {
      const file = makeFile(UPLOAD_MAX_BYTES * 2, VALID_MIME);
      const result = validateUploadFileSync(file);
      expect(result).not.toBeNull();
      expect(result?.reason).toBe('size');
    });

    it('size error carries a non-empty message string', () => {
      const file = makeFile(UPLOAD_MAX_BYTES + 1, VALID_MIME);
      const result = validateUploadFileSync(file);
      expect(typeof result?.message).toBe('string');
      expect(result!.message.length).toBeGreaterThan(0);
    });
  });

  describe('MIME check precedes size check', () => {
    it('returns {reason:"mime"} (not size) when both MIME and size are invalid', () => {
      // Source checks MIME first, then size — so mime wins when both fail.
      const file = makeFile(UPLOAD_MAX_BYTES + 1, INVALID_MIME);
      const result = validateUploadFileSync(file);
      expect(result?.reason).toBe('mime');
    });
  });

  describe('real File via Node 20 global', () => {
    it('constructs a real File and validates correctly', () => {
      const bytes = new Uint8Array(8);
      const realFile = new File([bytes], 'clip.mp4', { type: 'video/mp4' });
      expect(validateUploadFileSync(realFile)).toBeNull();
    });

    it('real File with disallowed MIME returns mime error', () => {
      const bytes = new Uint8Array(8);
      const realFile = new File([bytes], 'photo.png', { type: 'image/png' });
      expect(validateUploadFileSync(realFile)?.reason).toBe('mime');
    });
  });
});

// ---------------------------------------------------------------------------
// validateDuration
// ---------------------------------------------------------------------------

describe('validateDuration', () => {
  it('returns null for 0 seconds', () => {
    expect(validateDuration(0)).toBeNull();
  });

  it('returns null for a duration well within the limit', () => {
    expect(validateDuration(UPLOAD_MAX_DURATION_SEC / 2)).toBeNull();
  });

  it('returns null for duration exactly at UPLOAD_MAX_DURATION_SEC (boundary)', () => {
    expect(validateDuration(UPLOAD_MAX_DURATION_SEC)).toBeNull();
  });

  it('returns null for duration 1 second below the limit', () => {
    expect(validateDuration(UPLOAD_MAX_DURATION_SEC - 1)).toBeNull();
  });

  it('returns {reason:"duration"} for duration 1 second above the limit', () => {
    const result = validateDuration(UPLOAD_MAX_DURATION_SEC + 1);
    expect(result).not.toBeNull();
    expect(result?.reason).toBe('duration');
  });

  it('returns {reason:"duration"} for duration substantially over the limit', () => {
    const result = validateDuration(UPLOAD_MAX_DURATION_SEC * 10);
    expect(result).not.toBeNull();
    expect(result?.reason).toBe('duration');
  });

  it('duration error carries a non-empty message string', () => {
    const result = validateDuration(UPLOAD_MAX_DURATION_SEC + 1);
    expect(typeof result?.message).toBe('string');
    expect(result!.message.length).toBeGreaterThan(0);
  });
});
