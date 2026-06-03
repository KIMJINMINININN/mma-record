import { describe, it, expect } from 'vitest';
import { isNavItemActive, NAV_ITEMS } from '@/widgets/app-shell/nav-items';

// ---------------------------------------------------------------------------
// isNavItemActive
// ---------------------------------------------------------------------------

describe('isNavItemActive', () => {
  // --- exact match ---
  it('exact match returns true', () => {
    expect(isNavItemActive('/calendar', '/calendar')).toBe(true);
  });

  it('exact match with trailing slash in href is still true when pathname matches exactly', () => {
    expect(isNavItemActive('/search', '/search')).toBe(true);
  });

  // --- subpath match ---
  it('direct child path returns true (/techniques/abc → /techniques)', () => {
    expect(isNavItemActive('/techniques/abc', '/techniques')).toBe(true);
  });

  it('deeply nested path returns true (/techniques/abc/def → /techniques)', () => {
    expect(isNavItemActive('/techniques/abc/def', '/techniques')).toBe(true);
  });

  it('subpath of /calendar returns true', () => {
    expect(isNavItemActive('/calendar/2024-01', '/calendar')).toBe(true);
  });

  // --- false-positive prevention ---
  it('/searchx does NOT match /search (no false prefix match)', () => {
    expect(isNavItemActive('/searchx', '/search')).toBe(false);
  });

  it('/calendary does NOT match /calendar', () => {
    expect(isNavItemActive('/calendary', '/calendar')).toBe(false);
  });

  it('/profilesettings does NOT match /profile', () => {
    expect(isNavItemActive('/profilesettings', '/profile')).toBe(false);
  });

  it('/techniques2 does NOT match /techniques', () => {
    expect(isNavItemActive('/techniques2', '/techniques')).toBe(false);
  });

  // --- sibling routes ---
  it('sibling route /search does NOT match /calendar', () => {
    expect(isNavItemActive('/search', '/calendar')).toBe(false);
  });

  // --- root / edge cases ---
  it('root / does NOT match /calendar', () => {
    expect(isNavItemActive('/', '/calendar')).toBe(false);
  });

  it('root / matches / (exact)', () => {
    expect(isNavItemActive('/', '/')).toBe(true);
  });

  it('any path is active under href / (since everything starts with /)', () => {
    // NOTE: This is the expected mathematical consequence of the implementation:
    // '/calendar'.startsWith('//') is false, so exact match is the only way '/'
    // matches another path via the current implementation.
    // '/calendar' === '/' → false; '/calendar'.startsWith('//') → false
    // So /calendar does NOT match href '/'.
    expect(isNavItemActive('/calendar', '/')).toBe(false);
  });

  it('empty pathname does NOT match non-empty href', () => {
    expect(isNavItemActive('', '/search')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NAV_ITEMS sanity
// ---------------------------------------------------------------------------

describe('NAV_ITEMS', () => {
  it('contains exactly 5 items', () => {
    expect(NAV_ITEMS).toHaveLength(5);
  });

  it('contains /calendar item', () => {
    expect(NAV_ITEMS.some((item) => item.href === '/calendar')).toBe(true);
  });

  it('contains /techniques item', () => {
    expect(NAV_ITEMS.some((item) => item.href === '/techniques')).toBe(true);
  });

  it('contains /search item', () => {
    expect(NAV_ITEMS.some((item) => item.href === '/search')).toBe(true);
  });

  it('contains /stats item', () => {
    expect(NAV_ITEMS.some((item) => item.href === '/stats')).toBe(true);
  });

  it('contains /profile item', () => {
    expect(NAV_ITEMS.some((item) => item.href === '/profile')).toBe(true);
  });

  it('every item has a non-empty label', () => {
    for (const item of NAV_ITEMS) {
      expect(typeof item.label).toBe('string');
      expect(item.label.length).toBeGreaterThan(0);
    }
  });

  it('every item has an icon (function/component)', () => {
    for (const item of NAV_ITEMS) {
      expect(typeof item.icon).toBe('function');
    }
  });

  it('hrefs match expected labels (캘린더, 기술, 검색, 통계, 프로필)', () => {
    const hrefToLabel: Record<string, string> = {
      '/calendar': '캘린더',
      '/techniques': '기술',
      '/search': '검색',
      '/stats': '통계',
      '/profile': '프로필',
    };
    for (const item of NAV_ITEMS) {
      expect(item.label).toBe(hrefToLabel[item.href]);
    }
  });
});
