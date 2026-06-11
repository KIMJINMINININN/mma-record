import { describe, it, expect } from 'vitest';

import { buildShareOgText, GENERIC_SHARE_OG } from './share-og';
import type { SharedResourceEnvelope } from '@/shared/model/shared-resource';
import type { SharedSession, SharedTechniqueResource } from '@/shared/model/shared-resource';

/**
 * share-og — OG 제목/설명 빌더(순수 함수) 검증.
 *   1) 세션+메모 → 날짜·종목 제목 + 메모 한 줄(마크다운 장식 제거).
 *   2) 세션 메모 없음 → 종목·시간·기술 수 요약 설명.
 *   3) 기술 → 이름—종목 제목 + 설명 한 줄.
 *   4) 무효(null)/삭제(data null) → 일반 문구(존재 누설 없음).
 */

function session(over: Partial<SharedSession>): SharedResourceEnvelope {
  return {
    type: 'session',
    data: {
      trained_on: '2026-06-11',
      gym: null,
      class_type: null,
      duration_min: null,
      intensity: null,
      rounds: null,
      partners: null,
      memo_md: null,
      disciplines: [],
      techniques: [],
      tags: [],
      media: [],
      ...over,
    },
  };
}

function technique(over: Partial<SharedTechniqueResource>): SharedResourceEnvelope {
  return {
    type: 'technique',
    data: {
      name: '니 슬라이스 패스',
      discipline: 'bjj_gi',
      category: 'pass',
      position: null,
      striking_style: null,
      belt: null,
      belt_stripes: null,
      level: null,
      description_md: null,
      details_md: null,
      tags: [],
      media: [],
      ...over,
    },
  };
}

describe('buildShareOgText', () => {
  it('세션+메모: 날짜·종목 제목 + 마크다운 걷어낸 메모 한 줄', () => {
    const og = buildShareOgText(
      session({
        disciplines: ['bjj_gi', 'striking'],
        memo_md: '## 오늘 복습\n**가드 리텐션** 위주로 돌았다.',
      }),
    );
    expect(og.title).toBe('6월 11일 주짓수 (기)·타격 훈련 기록 · MatLog');
    expect(og.description).toBe('오늘 복습 가드 리텐션 위주로 돌았다.');
  });

  it('세션 메모 없음: 종목·시간·기술 수 요약', () => {
    const og = buildShareOgText(
      session({
        disciplines: ['wrestling'],
        duration_min: 90,
        techniques: [{ name: '더블렉', discipline: 'wrestling', day_memo_md: null }],
      }),
    );
    expect(og.description).toBe('레슬링 · 90분 · 다룬 기술 1개 — MatLog 훈련 기록');
  });

  it('기술: 이름 — 종목 제목 + 설명 한 줄(없으면 일반 안내)', () => {
    const withDesc = buildShareOgText(technique({ description_md: '니 슬라이스로 하프 압박.' }));
    expect(withDesc.title).toBe('니 슬라이스 패스 — 주짓수 (기) 기술 · MatLog');
    expect(withDesc.description).toBe('니 슬라이스로 하프 압박.');

    const noDesc = buildShareOgText(technique({}));
    expect(noDesc.description).toBe('주짓수 (기) 기술 노트 — MatLog에서 확인하세요.');
  });

  it('무효/삭제 토큰: 일반 문구(존재 누설 없음)', () => {
    expect(buildShareOgText(null)).toEqual(GENERIC_SHARE_OG);
    expect(buildShareOgText({ type: 'session', data: null })).toEqual(GENERIC_SHARE_OG);
  });

  it('긴 메모는 80자에서 말줄임', () => {
    const long = '가'.repeat(120);
    const og = buildShareOgText(session({ memo_md: long }));
    expect(og.description.length).toBe(80);
    expect(og.description.endsWith('…')).toBe(true);
  });
});
