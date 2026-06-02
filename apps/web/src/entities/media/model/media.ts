/**
 * media_assets / media_links 모델 — TS 타입 + zod 스키마.
 * SQL `0008_media_assets.sql` 와 1:1 동치 — 컬럼명은 DB 그대로 snake_case 유지.
 * (PRD F5 / Develop §7)
 */

import { z } from 'zod';
import { VISIBILITIES } from '@/shared/model/enums';
import { isoTimestamp } from '@/shared/lib/zod';

/**
 * media_assets — 하이브리드 미디어(업로드/유튜브/외부 링크).
 * DB의 `media_kind_shape` check 제약을 zod discriminated union('kind')으로 표현:
 *  - upload   → storage_path 필수
 *  - youtube  → youtube_video_id 필수
 *  - external → external_url 필수
 * 나머지 kind별 비필수 컬럼은 모든 variant에서 nullable 로 허용한다.
 */

/** kind별로 공유하는 공통 컬럼 (id/user_id/표시/메타/visibility/created_at) */
const mediaAssetBaseShape = {
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  /** 업로드 길이(초). 표시/한도 검증용 (음수 불가) */
  duration_sec: z.number().int().nonnegative().nullable(),
  /**
   * 용량(바이트). DB bigint → number 로 매핑.
   * 현실 영상 용량 범위 안전, 단 2^53 초과 시 number 정밀도 손실(이론상 한계).
   */
  size_bytes: z.number().int().nonnegative().nullable(),
  /** 업로드 썸네일 Storage 경로 */
  thumbnail_path: z.string().nullable(),
  title: z.string().nullable(),
  visibility: z.enum(VISIBILITIES),
  created_at: isoTimestamp,
} as const;

/** kind = 'upload' → storage_path 필수, 그 외 kind 전용 컬럼은 null */
const mediaAssetUploadSchema = z.object({
  ...mediaAssetBaseShape,
  kind: z.literal('upload'),
  storage_path: z.string(),
  youtube_video_id: z.string().nullable(),
  external_url: z.string().nullable(),
});

/** kind = 'youtube' → youtube_video_id 필수 (URL 아님, ID만 저장) */
const mediaAssetYoutubeSchema = z.object({
  ...mediaAssetBaseShape,
  kind: z.literal('youtube'),
  storage_path: z.string().nullable(),
  youtube_video_id: z.string(),
  external_url: z.string().nullable(),
});

/** kind = 'external' → external_url 필수 */
const mediaAssetExternalSchema = z.object({
  ...mediaAssetBaseShape,
  kind: z.literal('external'),
  storage_path: z.string().nullable(),
  youtube_video_id: z.string().nullable(),
  external_url: z.string(),
});

export const mediaAssetSchema = z.discriminatedUnion('kind', [
  mediaAssetUploadSchema,
  mediaAssetYoutubeSchema,
  mediaAssetExternalSchema,
]);
export type MediaAsset = z.infer<typeof mediaAssetSchema>;

/**
 * 신규 입력용 스키마 — technique/session insert 와 일관.
 * 서버 생성 컬럼(id/user_id/created_at) 제외, visibility 는 DB default 'private' 이므로 optional.
 * discriminator('kind')를 유지하기 위해 각 variant를 omit/extend 한 뒤 union 재구성한다.
 */
const mediaAssetInsertOmit = {
  id: true,
  user_id: true,
  created_at: true,
} as const;

export const mediaAssetInsertSchema = z.discriminatedUnion('kind', [
  mediaAssetUploadSchema
    .omit(mediaAssetInsertOmit)
    .extend({ visibility: z.enum(VISIBILITIES).optional() }),
  mediaAssetYoutubeSchema
    .omit(mediaAssetInsertOmit)
    .extend({ visibility: z.enum(VISIBILITIES).optional() }),
  mediaAssetExternalSchema
    .omit(mediaAssetInsertOmit)
    .extend({ visibility: z.enum(VISIBILITIES).optional() }),
]);
export type MediaAssetInsert = z.infer<typeof mediaAssetInsertSchema>;

/**
 * media_links — 듀얼 FK 연결(세션 또는 기술 중 정확히 하나).
 * DB check `num_nonnulls(session_id, technique_id) = 1` 를 zod superRefine 의 XOR 로 표현.
 */
export const mediaLinkSchema = z
  .object({
    id: z.string().uuid(),
    media_id: z.string().uuid(),
    session_id: z.string().uuid().nullable(),
    technique_id: z.string().uuid().nullable(),
    created_at: isoTimestamp,
  })
  .superRefine((val, ctx) => {
    // 정확히 하나의 부모만 가져야 한다 (둘 다 null 또는 둘 다 값 → 위반)
    const nonNullCount =
      (val.session_id !== null ? 1 : 0) + (val.technique_id !== null ? 1 : 0);
    if (nonNullCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'media_links 는 session_id 또는 technique_id 중 정확히 하나만 가져야 합니다.',
        path: ['session_id'],
      });
    }
  });
export type MediaLink = z.infer<typeof mediaLinkSchema>;
