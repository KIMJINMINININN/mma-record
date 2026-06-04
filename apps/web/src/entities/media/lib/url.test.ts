import { describe, it, expect } from 'vitest';
import { domainAvatar, safeExternalUrl, urlHost } from './url';

describe('safeExternalUrl', () => {
  it('https 허용(정규화)', () => expect(safeExternalUrl('https://ex.com/a')).toBe('https://ex.com/a'));
  it('http 허용', () => expect(safeExternalUrl('http://ex.com')).toBe('http://ex.com/'));
  it('앞뒤 공백 트림', () => expect(safeExternalUrl('  https://ex.com/a  ')).toBe('https://ex.com/a'));
  it('javascript: 차단', () => expect(safeExternalUrl('javascript:alert(1)')).toBeNull());
  it('data: 차단', () => expect(safeExternalUrl('data:text/html,x')).toBeNull());
  it('비-URL 차단', () => expect(safeExternalUrl('not a url')).toBeNull());
  it('null/빈 → null', () => {
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl('')).toBeNull();
  });
});

describe('urlHost', () => {
  it('호스트 추출', () => expect(urlHost('https://www.ex.com/a?b=1')).toBe('www.ex.com'));
  it('비-URL → null', () => expect(urlHost('nope')).toBeNull());
});

describe('domainAvatar', () => {
  it('첫 글자 대문자 + www. 제거 라벨', () => {
    const a = domainAvatar('www.youtube.com');
    expect(a.letter).toBe('Y');
    expect(a.label).toBe('youtube.com');
  });
  it('hue 는 0~359 범위 + 같은 host 결정적(SSR 안전)', () => {
    const a = domainAvatar('instagram.com');
    const b = domainAvatar('instagram.com');
    expect(a.hue).toBe(b.hue);
    expect(a.hue).toBeGreaterThanOrEqual(0);
    expect(a.hue).toBeLessThan(360);
  });
});
