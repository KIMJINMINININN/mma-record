import { describe, it, expect } from 'vitest';
import {
  TAG_COLOR_KEYS,
  TAG_COLOR_META,
  isTagColorKey,
  resolveTagColor,
  tagColorCss,
} from './tag-meta';

const HEX = /^#[0-9a-f]{6}$/i;
// 회피: 브랜드 빨강 + 종목 5색(light).
const AVOID = new Set(['#e11d2a', '#1d4ed8', '#0e7490', '#b45309', '#c2410c', '#5b21b6']);

describe('TAG_COLOR_META palette', () => {
  it('10개 키, 중복 없음', () => {
    expect(TAG_COLOR_KEYS).toHaveLength(10);
    expect(new Set(TAG_COLOR_KEYS).size).toBe(10);
  });

  it('모든 키에 메타 존재(Record 완전성)', () => {
    for (const k of TAG_COLOR_KEYS) {
      expect(TAG_COLOR_META[k]).toBeDefined();
      expect(TAG_COLOR_META[k].key).toBe(k);
      expect(TAG_COLOR_META[k].label.length).toBeGreaterThan(0);
    }
    expect(Object.keys(TAG_COLOR_META)).toHaveLength(10);
  });

  it('color/colorDark 모두 6자리 hex', () => {
    for (const k of TAG_COLOR_KEYS) {
      expect(TAG_COLOR_META[k].color).toMatch(HEX);
      expect(TAG_COLOR_META[k].colorDark).toMatch(HEX);
    }
  });

  it('브랜드 빨강·종목색과 겹치지 않음', () => {
    for (const k of TAG_COLOR_KEYS) {
      expect(AVOID.has(TAG_COLOR_META[k].color.toLowerCase())).toBe(false);
      expect(AVOID.has(TAG_COLOR_META[k].colorDark.toLowerCase())).toBe(false);
    }
  });
});

describe('isTagColorKey', () => {
  it('유효 키 true', () => expect(isTagColorKey('teal')).toBe(true));
  it('hex false', () => expect(isTagColorKey('#ff5733')).toBe(false));
  it('null false', () => expect(isTagColorKey(null)).toBe(false));
  it('unknown false', () => expect(isTagColorKey('bogus')).toBe(false));
});

describe('resolveTagColor', () => {
  it('유효 키 → 메타', () => expect(resolveTagColor('teal')).toEqual(TAG_COLOR_META.teal));
  it('hex → null(예외 없음)', () => expect(resolveTagColor('#ff5733')).toBeNull());
  it('null → null', () => expect(resolveTagColor(null)).toBeNull());
  it('unknown → null', () => expect(resolveTagColor('nope')).toBeNull());
});

describe('tagColorCss', () => {
  it('light-dark() 문자열', () => {
    expect(tagColorCss(TAG_COLOR_META.sky)).toBe('light-dark(#0369a1, #38bdf8)');
  });
});
