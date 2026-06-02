import { z } from 'zod';
import { isoTimestamp } from '@/shared/lib/zod';

/**
 * 태그 모델 — `tags` 테이블과 1:1 (마이그레이션 0009 / PRD F7).
 * 컬럼명은 DB 그대로 snake_case 유지 (향후 db:types 생성물과 정합).
 */

/** `tags` 행 스키마. unique(user_id, name) — 사용자별 태그 이름 유일. */
export const tagSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  /** P1 태그 색 (PRD F7/AC4) — nullable */
  color: z.string().nullable(),
  created_at: isoTimestamp,
});
export type Tag = z.infer<typeof tagSchema>;

/** 태그 생성 입력 — 서버 생성/소유 컬럼(id/user_id/created_at) 제외. */
export const tagInsertSchema = tagSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
});
export type TagInsert = z.infer<typeof tagInsertSchema>;

/**
 * `taggables` 행 스키마 — 듀얼 FK (마이그레이션 0009).
 * 폴리모픽 대신 실제 FK 2개(session_id / technique_id) + XOR 제약.
 * DB `check (num_nonnulls(session_id, technique_id) = 1)` 와 동치.
 */
export const taggableSchema = z
  .object({
    id: z.string().uuid(),
    tag_id: z.string().uuid(),
    session_id: z.string().uuid().nullable(),
    technique_id: z.string().uuid().nullable(),
  })
  .superRefine((val, ctx) => {
    const attached = [val.session_id, val.technique_id].filter(
      (v) => v !== null,
    ).length;
    if (attached !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'taggables는 session_id 또는 technique_id 중 정확히 하나에만 연결되어야 합니다 (XOR).',
        path: attached === 0 ? ['session_id'] : ['technique_id'],
      });
    }
  });
export type Taggable = z.infer<typeof taggableSchema>;
