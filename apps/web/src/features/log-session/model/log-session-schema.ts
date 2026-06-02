import { z } from 'zod';
import { DISCIPLINES, CLASS_TYPES } from '@/shared/model/enums';

/**
 * 세션 기록(log_session) 입력 스키마 (F3 / Develop §12 · 0013_log_session.sql).
 *
 * log_session RPC 파라미터와 1:1 미러 — 컬럼명은 DB 그대로 snake_case(session.ts 정합).
 * 종목(disciplines)만 필수(F3-AC1/AC6), 나머지는 nullable. 'YYYY-MM-DD' 날짜 정규식은
 * session.ts의 DATE_REGEX 관용구를 그대로 따른다.
 *
 * 태그(F7)는 **이름**으로 받아 서버 액션이 resolveTagIds로 tags 행 생성/조회 후 RPC p_tag_ids에 매핑한다(#6-1).
 * F4/F5(다룬 기술·미디어) 연동 전까지 techniques/media는 항상 빈 배열(셸)로 들어오지만 RPC 계약 유지를 위해 둔다.
 *
 * SSoT: docs/mma/Develop.md §12 / PRD §F3
 */

/** 'YYYY-MM-DD' (DB `date` 타입, KST 날짜) — session.ts 관용구 재사용. */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const logSessionInputSchema = z.object({
  trained_on: z.string().regex(DATE_REGEX, 'YYYY-MM-DD 형식이어야 합니다'),
  disciplines: z.array(z.enum(DISCIPLINES)).min(1, '종목을 1개 이상 선택하세요.'),
  gym: z.string().trim().max(120).nullable().optional(),
  class_type: z.enum(CLASS_TYPES).nullable().optional(),
  duration_min: z.number().int().min(0).max(1440).nullable().optional(),
  intensity: z.number().int().min(1).max(5).nullable().optional(),
  rounds: z.number().int().min(0).max(99).nullable().optional(),
  partners: z.string().trim().max(200).nullable().optional(),
  memo_md: z.string().trim().max(5000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  // 태그는 이름으로 수집(서버 액션이 id로 해석, #6-1). UI가 12개로 가드하지만 방어적 상한.
  tag_names: z.array(z.string().trim().min(1)).max(50).default([]),
  // F4/F5 연동 전까지 항상 빈 배열(셸). RPC 계약 유지를 위해 스키마엔 존재.
  techniques: z
    .array(z.object({ technique_id: z.string().uuid(), day_memo_md: z.string().nullable() }))
    .default([]),
  media: z.array(z.object({ media_id: z.string().uuid() })).default([]),
});
export type LogSessionInput = z.infer<typeof logSessionInputSchema>;
