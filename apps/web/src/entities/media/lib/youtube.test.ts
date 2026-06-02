import { describe, it, expect } from 'vitest';
import {
  parseYoutubeVideoId,
  buildYoutubeEmbedUrl,
  buildYoutubeThumbnailUrl,
} from '@/entities/media/lib/youtube';

// A canonical valid 11-char videoId used as the "happy path" fixture.
const VALID_ID = 'dQw4w9WgXcQ';

// ──────────────────────────────────────────────────────────────────────────────
// parseYoutubeVideoId
// ──────────────────────────────────────────────────────────────────────────────
describe('parseYoutubeVideoId', () => {
  // ── Case 1: bare 11-char videoId ────────────────────────────────────────────
  describe('bare videoId input', () => {
    it('returns the id when given exactly 11 alphanumeric/dash/underscore chars', () => {
      expect(parseYoutubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('allows underscores and hyphens in a bare id', () => {
      expect(parseYoutubeVideoId('_-aBcDeFgHi')).toBe('_-aBcDeFgHi');
    });

    it('returns null for a 10-char string (too short)', () => {
      expect(parseYoutubeVideoId('dQw4w9WgXc')).toBeNull();
    });

    it('returns null for a 12-char string (too long)', () => {
      expect(parseYoutubeVideoId('dQw4w9WgXcQX')).toBeNull();
    });

    it('returns null for 11 chars containing an invalid character (!)', () => {
      expect(parseYoutubeVideoId('dQw4w9WgXc!')).toBeNull();
    });

    it('returns null for 11 chars containing a space', () => {
      expect(parseYoutubeVideoId('dQw4w9WgXc ')).toBeNull();
    });
  });

  // ── Case 2: youtube.com/watch?v=ID ──────────────────────────────────────────
  describe('youtube.com/watch?v= URL', () => {
    it('extracts id from https://www.youtube.com/watch?v=ID', () => {
      expect(parseYoutubeVideoId(`https://www.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
    });

    it('extracts id from http://www.youtube.com/watch?v=ID', () => {
      expect(parseYoutubeVideoId(`http://www.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
    });

    it('ignores extra query params (t=, list=, etc.)', () => {
      expect(
        parseYoutubeVideoId(`https://www.youtube.com/watch?v=${VALID_ID}&t=42&list=PLxxx`),
      ).toBe(VALID_ID);
    });

    it('extracts id without www subdomain', () => {
      expect(parseYoutubeVideoId(`https://youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
    });

    it('extracts id from m.youtube.com (mobile)', () => {
      expect(parseYoutubeVideoId(`https://m.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
    });

    it('extracts id from music.youtube.com', () => {
      expect(parseYoutubeVideoId(`https://music.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
    });

    it('returns null when v= param is missing', () => {
      expect(parseYoutubeVideoId('https://www.youtube.com/watch')).toBeNull();
    });

    it('returns null when v= param holds an invalid-length id', () => {
      expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=tooshort')).toBeNull();
    });
  });

  // ── Case 3: youtu.be/ID ─────────────────────────────────────────────────────
  describe('youtu.be short URL', () => {
    it('extracts id from https://youtu.be/ID', () => {
      expect(parseYoutubeVideoId(`https://youtu.be/${VALID_ID}`)).toBe(VALID_ID);
    });

    it('ignores ?t= query param on youtu.be', () => {
      expect(parseYoutubeVideoId(`https://youtu.be/${VALID_ID}?t=30`)).toBe(VALID_ID);
    });

    it('returns null for youtu.be with no path segment', () => {
      expect(parseYoutubeVideoId('https://youtu.be/')).toBeNull();
    });

    it('returns null for youtu.be with invalid-length id in path', () => {
      expect(parseYoutubeVideoId('https://youtu.be/short')).toBeNull();
    });
  });

  // ── Case 4: /embed/ID ────────────────────────────────────────────────────────
  describe('/embed/ID path', () => {
    it('extracts id from /embed/ID', () => {
      expect(parseYoutubeVideoId(`https://www.youtube.com/embed/${VALID_ID}`)).toBe(VALID_ID);
    });

    it('returns null for /embed/ with no id segment', () => {
      expect(parseYoutubeVideoId('https://www.youtube.com/embed/')).toBeNull();
    });
  });

  // ── Case 5: /shorts/ID ───────────────────────────────────────────────────────
  describe('/shorts/ID path', () => {
    it('extracts id from /shorts/ID', () => {
      expect(parseYoutubeVideoId(`https://www.youtube.com/shorts/${VALID_ID}`)).toBe(VALID_ID);
    });

    it('returns null for /shorts/ with invalid id', () => {
      expect(parseYoutubeVideoId('https://www.youtube.com/shorts/bad')).toBeNull();
    });
  });

  // ── Case 6: /v/ID ────────────────────────────────────────────────────────────
  describe('/v/ID path', () => {
    it('extracts id from /v/ID', () => {
      expect(parseYoutubeVideoId(`https://www.youtube.com/v/${VALID_ID}`)).toBe(VALID_ID);
    });
  });

  // ── Case 7: /live/ID ─────────────────────────────────────────────────────────
  describe('/live/ID path', () => {
    it('extracts id from /live/ID', () => {
      expect(parseYoutubeVideoId(`https://www.youtube.com/live/${VALID_ID}`)).toBe(VALID_ID);
    });
  });

  // ── Case 8: legacy /attribution_link ────────────────────────────────────────
  describe('legacy attribution_link URL', () => {
    it('extracts id from attribution_link?u=/watch?v=ID', () => {
      const u = encodeURIComponent(`/watch?v=${VALID_ID}`);
      expect(
        parseYoutubeVideoId(`https://www.youtube.com/attribution_link?u=${u}`),
      ).toBe(VALID_ID);
    });

    it('returns null when attribution_link u= points to a non-watch path', () => {
      const u = encodeURIComponent(`/shorts/${VALID_ID}`);
      expect(
        parseYoutubeVideoId(`https://www.youtube.com/attribution_link?u=${u}`),
      ).toBeNull();
    });

    it('returns null when attribution_link has no u= param', () => {
      expect(
        parseYoutubeVideoId('https://www.youtube.com/attribution_link'),
      ).toBeNull();
    });
  });

  // ── Case 9: protocol variations ─────────────────────────────────────────────
  describe('protocol-relative and no-protocol inputs', () => {
    it('handles protocol-relative //youtu.be/ID', () => {
      expect(parseYoutubeVideoId(`//youtu.be/${VALID_ID}`)).toBe(VALID_ID);
    });

    it('handles protocol-relative //www.youtube.com/watch?v=ID', () => {
      expect(parseYoutubeVideoId(`//www.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
    });

    it('handles no-protocol youtu.be/ID (bare host/path)', () => {
      expect(parseYoutubeVideoId(`youtu.be/${VALID_ID}`)).toBe(VALID_ID);
    });

    it('handles no-protocol www.youtube.com/watch?v=ID', () => {
      expect(parseYoutubeVideoId(`www.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
    });
  });

  // ── Case 10: subdomains ──────────────────────────────────────────────────────
  describe('subdomains', () => {
    it('accepts www.youtube.com', () => {
      expect(parseYoutubeVideoId(`https://www.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
    });

    it('accepts m.youtube.com', () => {
      expect(parseYoutubeVideoId(`https://m.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
    });

    it('accepts music.youtube.com', () => {
      expect(parseYoutubeVideoId(`https://music.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
    });

    it('accepts bare youtube.com (no subdomain)', () => {
      expect(parseYoutubeVideoId(`https://youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
    });

    it('rejects an arbitrary subdomain on youtube.com that is NOT youtube.com itself', () => {
      // e.g. evil.youtube.com.example.com — not a youtube host
      expect(parseYoutubeVideoId(`https://evil.youtube.com.example.com/watch?v=${VALID_ID}`)).toBeNull();
    });
  });

  // ── Case 11: trailing-dot FQDN ──────────────────────────────────────────────
  describe('trailing-dot FQDN (fully qualified domain names)', () => {
    it('extracts id from https://www.youtube.com./watch?v=ID (trailing dot)', () => {
      expect(parseYoutubeVideoId(`https://www.youtube.com./watch?v=${VALID_ID}`)).toBe(VALID_ID);
    });

    it('extracts id from https://youtu.be./ID (trailing dot on short host)', () => {
      expect(parseYoutubeVideoId(`https://youtu.be./${VALID_ID}`)).toBe(VALID_ID);
    });
  });

  // ── Case 12: mixed-case host ─────────────────────────────────────────────────
  describe('mixed-case host', () => {
    it('handles HTTPS://WWW.YOUTUBE.COM/watch?v=ID (uppercase host)', () => {
      expect(parseYoutubeVideoId(`HTTPS://WWW.YOUTUBE.COM/watch?v=${VALID_ID}`)).toBe(VALID_ID);
    });

    it('handles https://Youtu.Be/ID (mixed-case short host)', () => {
      expect(parseYoutubeVideoId(`https://Youtu.Be/${VALID_ID}`)).toBe(VALID_ID);
    });
  });

  // ── Case 13: path segment case normalization ─────────────────────────────────
  describe('path segment case handling', () => {
    // The source normalizes head to lowercase, so WATCH / EMBED etc. will route
    // to the correct case. The id itself is NOT lowercased (case-sensitive ids).
    it('extracts id when path segment is lowercase "watch"', () => {
      expect(parseYoutubeVideoId(`https://www.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID);
    });
  });

  // ── Case 14: NULL / rejection cases ─────────────────────────────────────────
  describe('null / rejection cases', () => {
    it('returns null for empty string', () => {
      expect(parseYoutubeVideoId('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(parseYoutubeVideoId('   ')).toBeNull();
    });

    it('returns null for a non-youtube host (e.g. vimeo.com)', () => {
      expect(parseYoutubeVideoId(`https://vimeo.com/watch?v=${VALID_ID}`)).toBeNull();
    });

    it('returns null for a completely garbage string', () => {
      expect(parseYoutubeVideoId('not a url at all!!!')).toBeNull();
    });

    it('returns null for a youtube URL with wrong-length id (10 chars)', () => {
      expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXc')).toBeNull();
    });

    it('returns null for a youtube URL with wrong-length id (12 chars)', () => {
      expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQX')).toBeNull();
    });

    it('returns null for /feed path with v= param (top-level v= not trusted)', () => {
      expect(parseYoutubeVideoId(`https://www.youtube.com/feed?v=${VALID_ID}`)).toBeNull();
    });

    it('returns null for /results path with v= param (top-level v= not trusted)', () => {
      expect(parseYoutubeVideoId(`https://www.youtube.com/results?v=${VALID_ID}`)).toBeNull();
    });

    it('returns null for a URL that looks youtube-like but has invalid host (youtube.org)', () => {
      expect(parseYoutubeVideoId(`https://www.youtube.org/watch?v=${VALID_ID}`)).toBeNull();
    });

    it('returns null for input that is just a valid url to youtube homepage', () => {
      expect(parseYoutubeVideoId('https://www.youtube.com/')).toBeNull();
    });

    it('trims leading/trailing whitespace before parsing', () => {
      expect(parseYoutubeVideoId(`  https://www.youtube.com/watch?v=${VALID_ID}  `)).toBe(VALID_ID);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// buildYoutubeEmbedUrl
// ──────────────────────────────────────────────────────────────────────────────
describe('buildYoutubeEmbedUrl', () => {
  it('returns the standard embed URL for a valid id', () => {
    expect(buildYoutubeEmbedUrl(VALID_ID)).toBe(
      `https://www.youtube.com/embed/${VALID_ID}`,
    );
  });

  it('encodes the id with encodeURIComponent (no-op for standard chars)', () => {
    // Standard alphanumeric/dash/underscore ids are unchanged by encodeURIComponent
    const id = '_-AbCdEfGhI';
    expect(buildYoutubeEmbedUrl(id)).toBe(`https://www.youtube.com/embed/${encodeURIComponent(id)}`);
  });

  it('throws for an empty string', () => {
    expect(() => buildYoutubeEmbedUrl('')).toThrow();
  });

  it('throws for a 10-char id (too short)', () => {
    expect(() => buildYoutubeEmbedUrl('dQw4w9WgXc')).toThrow();
  });

  it('throws for a 12-char id (too long)', () => {
    expect(() => buildYoutubeEmbedUrl('dQw4w9WgXcQX')).toThrow();
  });

  it('throws for an id with invalid characters (space)', () => {
    expect(() => buildYoutubeEmbedUrl('dQw4w9WgXc ')).toThrow();
  });

  it('throws for a path-injection attempt (../../evil)', () => {
    expect(() => buildYoutubeEmbedUrl('../../evil')).toThrow();
  });

  it('throw message references the invalid id value', () => {
    expect(() => buildYoutubeEmbedUrl('bad')).toThrowError(/bad/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// buildYoutubeThumbnailUrl
// ──────────────────────────────────────────────────────────────────────────────
describe('buildYoutubeThumbnailUrl', () => {
  it('returns hqdefault thumbnail by default (no quality arg)', () => {
    expect(buildYoutubeThumbnailUrl(VALID_ID)).toBe(
      `https://img.youtube.com/vi/${VALID_ID}/hqdefault.jpg`,
    );
  });

  it('uses hqdefault for quality="hq"', () => {
    expect(buildYoutubeThumbnailUrl(VALID_ID, 'hq')).toBe(
      `https://img.youtube.com/vi/${VALID_ID}/hqdefault.jpg`,
    );
  });

  it('uses default for quality="default"', () => {
    expect(buildYoutubeThumbnailUrl(VALID_ID, 'default')).toBe(
      `https://img.youtube.com/vi/${VALID_ID}/default.jpg`,
    );
  });

  it('uses mqdefault for quality="mq"', () => {
    expect(buildYoutubeThumbnailUrl(VALID_ID, 'mq')).toBe(
      `https://img.youtube.com/vi/${VALID_ID}/mqdefault.jpg`,
    );
  });

  it('uses sddefault for quality="sd"', () => {
    expect(buildYoutubeThumbnailUrl(VALID_ID, 'sd')).toBe(
      `https://img.youtube.com/vi/${VALID_ID}/sddefault.jpg`,
    );
  });

  it('uses maxresdefault for quality="maxres"', () => {
    expect(buildYoutubeThumbnailUrl(VALID_ID, 'maxres')).toBe(
      `https://img.youtube.com/vi/${VALID_ID}/maxresdefault.jpg`,
    );
  });

  it('encodes the id with encodeURIComponent (no-op for standard chars)', () => {
    const id = '_-AbCdEfGhI';
    expect(buildYoutubeThumbnailUrl(id)).toBe(
      `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`,
    );
  });

  it('uses img.youtube.com host (not www.youtube.com)', () => {
    const url = buildYoutubeThumbnailUrl(VALID_ID);
    expect(url.startsWith('https://img.youtube.com/')).toBe(true);
  });

  it('throws for an empty string', () => {
    expect(() => buildYoutubeThumbnailUrl('')).toThrow();
  });

  it('throws for a 10-char id (too short)', () => {
    expect(() => buildYoutubeThumbnailUrl('dQw4w9WgXc')).toThrow();
  });

  it('throws for a 12-char id (too long)', () => {
    expect(() => buildYoutubeThumbnailUrl('dQw4w9WgXcQX')).toThrow();
  });

  it('throws for an id with invalid characters', () => {
    expect(() => buildYoutubeThumbnailUrl('dQw4w9WgXc!')).toThrow();
  });

  it('throws for a path-injection attempt', () => {
    expect(() => buildYoutubeThumbnailUrl('../../evil')).toThrow();
  });
});
