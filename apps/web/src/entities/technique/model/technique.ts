import { z } from 'zod';
import {
  BELTS,
  DISCIPLINES,
  LEVELS,
  POSITION_KINDS,
  STRIKING_STYLES,
  TECHNIQUE_CATEGORIES,
  VISIBILITIES,
} from '@/shared/model/enums';
import { isoTimestamp } from '@/shared/lib/zod';

/**
 * techniques 테이블 스키마 (마이그레이션 0005 / PRD F4).
 * 컬럼명은 DB 그대로 snake_case 유지 — 향후 db:types 생성물과 정합.
 * SQL `0005_techniques.sql` 와 1:1 — 한쪽 변경 시 같은 PR에서 양쪽 동시 수정.
 */
export const techniqueSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  discipline: z.enum(DISCIPLINES),
  category: z.enum(TECHNIQUE_CATEGORIES),
  /** 컬럼명 position / 타입 position_kind. 선택(주로 그래플링) */
  position: z.enum(POSITION_KINDS).nullable(),
  /** 타격만(PRD §4.1). 비타격 기술은 null */
  striking_style: z.enum(STRIKING_STYLES).nullable(),
  /** "벨트 적합도"(주짓수만, 주관 가이드, PRD §4.3) */
  belt: z.enum(BELTS).nullable(),
  /** 벨트 그랄 0~4 */
  belt_stripes: z.number().int().min(0).max(4).nullable(),
  /** "레벨 적합도"(비벨트 종목 — 레슬링·타격·MMA, PRD §3). 주짓수(벨트 종목)는 null */
  level: z.enum(LEVELS).nullable(),
  /** 마크다운 설명 */
  description_md: z.string().nullable(),
  /** 주의점/디테일 (PRD F6 — UI 강조박스) */
  details_md: z.string().nullable(),
  visibility: z.enum(VISIBILITIES),
  created_at: isoTimestamp,
  updated_at: isoTimestamp,
});
export type Technique = z.infer<typeof techniqueSchema>;

/**
 * 신규 입력용 스키마 — 서버가 채우는 id/user_id/created_at/updated_at 제외.
 * visibility 는 DB default 'private' 이므로 입력 단계에서 optional.
 */
export const techniqueInsertSchema = techniqueSchema
  .omit({
    id: true,
    user_id: true,
    created_at: true,
    updated_at: true,
  })
  .extend({
    visibility: z.enum(VISIBILITIES).optional(),
  });
export type TechniqueInsert = z.infer<typeof techniqueInsertSchema>;
