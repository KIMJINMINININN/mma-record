import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

import { DISCIPLINE_META } from '@/entities/discipline';
import type { SharedResourceEnvelope } from '@/shared/model/shared-resource';
import type { Database } from '@/shared/api/supabase/types';

/**
 * share-og — `/share/[token]` OG 미리보기용 서버 페치 + 메타 빌더 (F11 후속).
 *
 * 카카오톡/메신저 크롤러는 JS를 실행하지 않으므로 generateMetadata가 **서버에서** 공유 데이터를
 * 읽어야 한다. 페이지 본문 페치는 기존대로 클라 아일랜드(ShareView) — 여기서는 메타 전용으로
 * **쿠키 없는 순수 anon 클라이언트**를 쓴다(서버 쿠키 세션이 끼어드는 문제 회피, page.tsx 주석 참조).
 *
 * 노출 수위: 공유 링크를 아는 사람이 보는 내용의 요약(제목·한 줄 설명)만 — 토큰 소유자가 이미
 * 공개를 선택한 정보다. 무효/삭제 토큰은 일반 문구로 응답해 존재 여부를 누설하지 않는다(기존 정책).
 */

/** 토큰 → 공유 봉투(없으면 null). React cache로 같은 렌더 패스 내 중복 호출 dedupe. */
export const fetchSharedResourceForOg = cache(
  async (token: string): Promise<SharedResourceEnvelope | null> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return null; // 인프라 전(도먼시) — 일반 메타로 폴백

    try {
      const anon = createClient<Database>(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await anon.rpc('get_shared_resource', { p_token: token });
      if (error || !data) return null;
      return data as unknown as SharedResourceEnvelope;
    } catch {
      return null;
    }
  },
);

/** 마크다운 장식을 걷어내고 공백을 접은 한 줄 요약(max자 + …). */
function plainLine(md: string | null | undefined, max: number): string | null {
  if (!md) return null;
  const text = md
    .replace(/```[\s\S]*?```/g, ' ') // 코드블록
    .replace(/[#>*_~`-]|\[(.*?)\]\(.*?\)/g, '$1') // 헤딩/강조/링크 장식
    .replace(/\s+/g, ' ')
    .trim();
  if (text === '') return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** 'YYYY-MM-DD' → 'M월 D일' (TZ 무관 문자열 파싱 — Date 미사용). */
function koreanDate(trainedOn: string): string {
  const [, m, d] = trainedOn.split('-');
  const month = Number(m);
  const day = Number(d);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return trainedOn;
  return `${month}월 ${day}일`;
}

export interface ShareOgText {
  title: string;
  description: string;
}

/** 무효/삭제 토큰용 일반 문구 — 존재 누설 없음. */
export const GENERIC_SHARE_OG: ShareOgText = {
  title: '공유 · MatLog',
  description: 'MatLog에서 공유된 훈련 기록입니다.',
};

/**
 * 공유 봉투 → OG 제목/설명 (순수 함수).
 *   세션:  "6월 11일 주짓수 (기) 훈련 기록 · MatLog" / 메모 한 줄(없으면 종목·시간·기술 수 요약)
 *   기술:  "니 슬라이스 패스 — 주짓수 (기) 기술 · MatLog" / 설명 한 줄(없으면 일반 문구)
 */
export function buildShareOgText(envelope: SharedResourceEnvelope | null): ShareOgText {
  if (!envelope || !envelope.data) return GENERIC_SHARE_OG;

  if (envelope.type === 'session') {
    const s = envelope.data;
    const labels = s.disciplines.map((d) => DISCIPLINE_META[d].label).join('·');
    const title = `${koreanDate(s.trained_on)} ${labels ? `${labels} ` : ''}훈련 기록 · MatLog`;

    const memo = plainLine(s.memo_md, 80);
    if (memo) return { title, description: memo };

    const parts: string[] = [];
    if (labels) parts.push(labels);
    if (s.duration_min != null) parts.push(`${s.duration_min}분`);
    if (s.techniques.length > 0) parts.push(`다룬 기술 ${s.techniques.length}개`);
    return {
      title,
      description: parts.length > 0 ? `${parts.join(' · ')} — MatLog 훈련 기록` : GENERIC_SHARE_OG.description,
    };
  }

  const t = envelope.data;
  const label = DISCIPLINE_META[t.discipline].label;
  return {
    title: `${t.name} — ${label} 기술 · MatLog`,
    description: plainLine(t.description_md, 80) ?? `${label} 기술 노트 — MatLog에서 확인하세요.`,
  };
}
