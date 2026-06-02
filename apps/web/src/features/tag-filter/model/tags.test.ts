import { describe, it, expect } from 'vitest';
import {
  normalizeTagName,
  tagKey,
  addTag,
  removeTagAt,
  filterSuggestions,
  DEFAULT_MAX_TAGS,
} from '@/features/tag-filter/model/tags';

describe('normalizeTagName', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeTagName('  hello  ')).toBe('hello');
  });

  it('trims tabs and newlines', () => {
    expect(normalizeTagName('\t MMA \n')).toBe('MMA');
  });

  it('preserves internal whitespace', () => {
    expect(normalizeTagName('  guard pass  ')).toBe('guard pass');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeTagName('   ')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeTagName('')).toBe('');
  });

  it('preserves original casing', () => {
    expect(normalizeTagName('  BJJ  ')).toBe('BJJ');
  });
});

describe('tagKey', () => {
  it('lowercases the name', () => {
    expect(tagKey('BJJ')).toBe('bjj');
  });

  it('trims whitespace before lowercasing', () => {
    expect(tagKey('  Guard Pass  ')).toBe('guard pass');
  });

  it('returns lowercase for already-lowercase input', () => {
    expect(tagKey('wrestling')).toBe('wrestling');
  });

  it('handles mixed case', () => {
    expect(tagKey('MuayThai')).toBe('muaythai');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(tagKey('   ')).toBe('');
  });
});

describe('addTag', () => {
  it('appends a normalized tag to the list', () => {
    const result = addTag(['bjj'], '  wrestling  ');
    expect(result).toEqual(['bjj', 'wrestling']);
  });

  it('normalizes (trims) the tag before appending', () => {
    const result = addTag([], '  grappling  ');
    expect(result).toEqual(['grappling']);
  });

  it('rejects empty string input — returns same array reference', () => {
    const list = ['bjj'];
    const result = addTag(list, '');
    expect(result).toBe(list);
  });

  it('rejects whitespace-only input — returns same array reference', () => {
    const list = ['bjj'];
    const result = addTag(list, '   ');
    expect(result).toBe(list);
  });

  it('rejects case-insensitive duplicate — returns same array reference', () => {
    const list = ['bjj'];
    const result = addTag(list, 'BJJ');
    expect(result).toBe(list);
  });

  it('rejects exact duplicate — returns same array reference', () => {
    const list = ['wrestling'];
    const result = addTag(list, 'wrestling');
    expect(result).toBe(list);
  });

  it('rejects duplicate with surrounding whitespace — returns same array reference', () => {
    const list = ['muaythai'];
    const result = addTag(list, '  Muaythai  ');
    expect(result).toBe(list);
  });

  it('returns a NEW array on success (no mutation of input)', () => {
    const list = ['bjj'];
    const result = addTag(list, 'wrestling');
    expect(result).not.toBe(list);
    // Original array must be untouched
    expect(list).toEqual(['bjj']);
  });

  it('new array contains the existing elements plus the new tag', () => {
    const result = addTag(['bjj', 'wrestling'], 'boxing');
    expect(result).toEqual(['bjj', 'wrestling', 'boxing']);
  });
});

describe('removeTagAt', () => {
  it('removes the tag at a valid index', () => {
    expect(removeTagAt(['bjj', 'wrestling', 'boxing'], 1)).toEqual(['bjj', 'boxing']);
  });

  it('removes the first element (index 0)', () => {
    expect(removeTagAt(['bjj', 'wrestling'], 0)).toEqual(['wrestling']);
  });

  it('removes the last element', () => {
    expect(removeTagAt(['bjj', 'wrestling'], 1)).toEqual(['bjj']);
  });

  it('returns the same array reference for a negative index', () => {
    const list = ['bjj', 'wrestling'];
    const result = removeTagAt(list, -1);
    expect(result).toBe(list);
  });

  it('returns the same array reference for an index equal to length', () => {
    const list = ['bjj'];
    const result = removeTagAt(list, 1);
    expect(result).toBe(list);
  });

  it('returns the same array reference for an index greater than length', () => {
    const list = ['bjj'];
    const result = removeTagAt(list, 99);
    expect(result).toBe(list);
  });

  it('returns the same array reference for an empty list with index 0', () => {
    const list: string[] = [];
    const result = removeTagAt(list, 0);
    expect(result).toBe(list);
  });

  it('returns a NEW array on valid removal (no mutation)', () => {
    const list = ['bjj', 'wrestling'];
    const result = removeTagAt(list, 0);
    expect(result).not.toBe(list);
    expect(list).toEqual(['bjj', 'wrestling']);
  });
});

describe('filterSuggestions', () => {
  const suggestions = ['BJJ', 'Wrestling', 'Boxing', 'Muay Thai', 'Judo'];

  it('returns all non-selected suggestions when query is empty', () => {
    expect(filterSuggestions(suggestions, '', [])).toEqual(suggestions);
  });

  it('case-insensitive partial match', () => {
    const result = filterSuggestions(suggestions, 'bjj', []);
    expect(result).toEqual(['BJJ']);
  });

  it('matches partial substring case-insensitively', () => {
    const result = filterSuggestions(suggestions, 'wres', []);
    expect(result).toEqual(['Wrestling']);
  });

  it('uppercase query still matches lowercase suggestion display', () => {
    const result = filterSuggestions(suggestions, 'BOXING', []);
    expect(result).toEqual(['Boxing']);
  });

  it('excludes already-selected items (exact match)', () => {
    const result = filterSuggestions(suggestions, '', ['Wrestling']);
    expect(result).not.toContain('Wrestling');
    expect(result).toHaveLength(suggestions.length - 1);
  });

  it('excludes already-selected items by tagKey (case-insensitive)', () => {
    // 'bjj' is stored as selected but suggestion is 'BJJ'
    const result = filterSuggestions(suggestions, '', ['bjj']);
    expect(result).not.toContain('BJJ');
  });

  it('empty query excludes all selected, returns all unselected', () => {
    const result = filterSuggestions(suggestions, '', ['BJJ', 'Judo']);
    expect(result).toEqual(['Wrestling', 'Boxing', 'Muay Thai']);
  });

  it('preserves original display case in results', () => {
    const result = filterSuggestions(suggestions, 'muay', []);
    expect(result).toEqual(['Muay Thai']);
  });

  it('returns empty array when all suggestions are selected', () => {
    const result = filterSuggestions(suggestions, '', suggestions);
    expect(result).toEqual([]);
  });

  it('returns empty array when no suggestion matches the query', () => {
    const result = filterSuggestions(suggestions, 'karate', []);
    expect(result).toEqual([]);
  });

  it('query match AND selection exclusion both apply together', () => {
    // 'b' matches 'BJJ' and 'Boxing' but 'bjj' is already selected
    const result = filterSuggestions(suggestions, 'b', ['BJJ']);
    expect(result).toEqual(['Boxing']);
  });

  it('returns empty array for empty suggestions list', () => {
    const result = filterSuggestions([], 'bjj', []);
    expect(result).toEqual([]);
  });
});

describe('DEFAULT_MAX_TAGS', () => {
  it('is the number 12', () => {
    expect(DEFAULT_MAX_TAGS).toBe(12);
  });

  it('is a positive integer', () => {
    expect(Number.isInteger(DEFAULT_MAX_TAGS)).toBe(true);
    expect(DEFAULT_MAX_TAGS).toBeGreaterThan(0);
  });
});
