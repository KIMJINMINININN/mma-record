import { z } from 'zod';
import { isoTimestamp } from '@/shared/lib/zod';
import { TAG_COLOR_KEYS } from '../lib/tag-meta';

/**
 * 태그 모델 — `tags` 테이블과 1:1 (마이그레이션 0009 / PRD F7).
 * 컬럼명은 DB 그대로 snake_case 유지 (향후 db:types 생성물과 정합).
 */

/** `tags` 행 스키마. unique(user_id, name) — 사용자별 태그 이름 유일. */
export const tagSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  /** P1 태그 색 (PRD F7/AC4) — nullable. 값은 팔레트 키(tag-meta) 또는 null. */
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

/** 태그 색 = 큐레이티드 팔레트 키 또는 null(없음). 자유 hex 금지(다크/대비 안전). */
export const tagColorSchema = z.union([z.enum(TAG_COLOR_KEYS), z.null()]);

/**
 * 태그 수정 입력 (F7-AC4 rename + recolor). name/color 각각 선택적(부분 수정 허용).
 * name은 trim 후 1자 이상. color는 팔레트 키 또는 null.
 */
export const tagUpdateSchema = z
  .object({
    name: z.string().trim().min(1, '태그 이름을 입력하세요.').max(40, '태그 이름이 너무 깁니다.').optional(),
    color: tagColorSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.color !== undefined, {
    message: '변경할 내용이 없습니다.',
  });
export type TagUpdate = z.infer<typeof tagUpdateSchema>;

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
