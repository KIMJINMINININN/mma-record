import { describe, it, expect } from 'vitest';
import { groupResults, resultHref } from '@/features/global-search/model/search';
import type { SearchResult } from '@/features/global-search/model/search';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(
  result_type: SearchResult['result_type'],
  result_id: string,
  subtitle: string | null = null,
  rank = 1.0,
): SearchResult {
  return { result_type, result_id, title: `${result_type}-${result_id}`, subtitle, belt: null, rank };
}

// ---------------------------------------------------------------------------
// groupResults
// ---------------------------------------------------------------------------

describe('groupResults', () => {
  it('returns all three empty arrays for empty input', () => {
    const grouped = groupResults([]);
    expect(grouped.technique).toEqual([]);
    expect(grouped.session).toEqual([]);
    expect(grouped.tag).toEqual([]);
  });

  it('partitions results into correct buckets by result_type', () => {
    const t1 = makeResult('technique', 'abc');
    const s1 = makeResult('session', 'def');
    const g1 = makeResult('tag', 'ghi');
    const grouped = groupResults([t1, s1, g1]);
    expect(grouped.technique).toEqual([t1]);
    expect(grouped.session).toEqual([s1]);
    expect(grouped.tag).toEqual([g1]);
  });

  it('preserves input (rank) order within each group', () => {
    const t1 = makeResult('technique', '1', null, 1.0);
    const t2 = makeResult('technique', '2', null, 0.7);
    const t3 = makeResult('technique', '3', null, 0.5);
    const s1 = makeResult('session', 'a', '2024-01-01', 0.9);
    const s2 = makeResult('session', 'b', '2024-02-01', 0.6);
    // interleaved order: t1, s1, t2, s2, t3
    const grouped = groupResults([t1, s1, t2, s2, t3]);
    expect(grouped.technique).toEqual([t1, t2, t3]);
    expect(grouped.session).toEqual([s1, s2]);
  });

  it('handles only-technique input — session and tag are empty', () => {
    const t1 = makeResult('technique', 'x');
    const t2 = makeResult('technique', 'y');
    const grouped = groupResults([t1, t2]);
    expect(grouped.technique).toEqual([t1, t2]);
    expect(grouped.session).toEqual([]);
    expect(grouped.tag).toEqual([]);
  });

  it('handles only-session input — technique and tag are empty', () => {
    const s1 = makeResult('session', 's1', '2024-03-15');
    const grouped = groupResults([s1]);
    expect(grouped.technique).toEqual([]);
    expect(grouped.session).toEqual([s1]);
    expect(grouped.tag).toEqual([]);
  });

  it('handles only-tag input — technique and session are empty', () => {
    const g1 = makeResult('tag', 'guard');
    const grouped = groupResults([g1]);
    expect(grouped.technique).toEqual([]);
    expect(grouped.session).toEqual([]);
    expect(grouped.tag).toEqual([g1]);
  });

  it('does not mutate the input array', () => {
    const items = [makeResult('technique', '1'), makeResult('session', '2', '2024-01-01')];
    const copy = [...items];
    groupResults(items);
    expect(items).toEqual(copy);
  });
});

// ---------------------------------------------------------------------------
// resultHref
// ---------------------------------------------------------------------------

describe('resultHref', () => {
  it('technique → /techniques/{id}', () => {
    const r = makeResult('technique', 'abc-123');
    expect(resultHref(r)).toBe('/techniques/abc-123');
  });

  it('tag → /tags (regardless of result_id)', () => {
    const r = makeResult('tag', 'guard');
    expect(resultHref(r)).toBe('/tags');
  });

  it('session with subtitle → /calendar?date={encodeURIComponent(subtitle)}', () => {
    const r = makeResult('session', 'sess-1', '2024-08-15');
    expect(resultHref(r)).toBe('/calendar?date=2024-08-15');
  });

  it('session with null subtitle → /calendar (no query string)', () => {
    const r = makeResult('session', 'sess-2', null);
    expect(resultHref(r)).toBe('/calendar');
  });

  it('session subtitle that needs URL-encoding is encoded', () => {
    // subtitle containing characters that require percent-encoding
    const r = makeResult('session', 'sess-3', '2024 08 15');
    expect(resultHref(r)).toBe('/calendar?date=2024%2008%2015');
  });

  it('session subtitle with special chars (+, =, &) is fully encoded', () => {
    const r = makeResult('session', 'sess-4', 'a+b=c&d');
    const href = resultHref(r);
    // encodeURIComponent encodes +, =, &
    expect(href).toBe(`/calendar?date=${encodeURIComponent('a+b=c&d')}`);
    // sanity: no unencoded + sign in the query value
    expect(href).not.toContain('?date=a+b');
  });

  it('technique href uses result_id verbatim (no extra encoding)', () => {
    const r = makeResult('technique', 'uuid-1234-abcd');
    expect(resultHref(r)).toBe('/techniques/uuid-1234-abcd');
  });
});
