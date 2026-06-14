import { describe, it, expect } from 'vitest';

import { buildJoinOgText, GENERIC_JOIN_OG } from './join-og';

/**
 * buildJoinOgText — 초대 OG 제목/설명 빌더(순수 함수). 유효 미리보기 vs 무효(누설 없음) 분기.
 */
describe('buildJoinOgText', () => {
  it('유효 미리보기 → 체육관명 + 인원 노출', () => {
    const og = buildJoinOgText({ name: '스파르타 짐', member_count: 7 });
    expect(og.title).toBe('스파르타 짐 체육관 초대 · MatLog');
    expect(og.description).toContain('멤버 7명');
  });

  it('무효/만료(null) → 일반 문구(존재 누설 없음)', () => {
    expect(buildJoinOgText(null)).toEqual(GENERIC_JOIN_OG);
    expect(GENERIC_JOIN_OG.title).not.toContain('명');
  });
});
