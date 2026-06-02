import { z } from 'zod';
import { VISIBILITIES } from '@/shared/model/enums';
import { isoTimestamp } from '@/shared/lib/zod';

/**
 * 프로필 모델 — `profiles` 테이블과 1:1 (마이그레이션 0003_profiles.sql).
 * 컬럼명은 DB 그대로 snake_case 유지 (향후 db:types 생성물과 정합).
 * PK는 별도 id 없이 `user_id`(auth.users(id) 참조). 행은 handle_new_user() 트리거가 자동 생성.
 * (PRD F1-AC3 / Develop §0003)
 */
export const profileSchema = z.object({
  /** auth.users(id) 참조 PK. 소유자 */
  user_id: z.string().uuid(),
  /** 표시명 (기본 빈 문자열). 최대 50자 */
  display_name: z.string().max(50),
  /** IANA TZ id (기본 'Asia/Seoul') */
  timezone: z.string().min(1),
  /** 공개 범위. 기본 'private' (공유 대비 시드) */
  visibility: z.enum(VISIBILITIES),
  /** ISO timestamp */
  created_at: isoTimestamp,
  /** ISO timestamp */
  updated_at: isoTimestamp,
});

/** profiles 1행 */
export type Profile = z.infer<typeof profileSchema>;

/**
 * 표시 정보 편집 입력용 (F1-AC3) — 사용자가 직접 수정하는 컬럼만.
 * 나머지(user_id/visibility/created_at/updated_at)는 서버·DB가 채운다.
 */
export const profileUpdateSchema = z.object({
  /** 표시명. 앞뒤 공백 제거 후 최대 50자 (빈 문자열 허용 = 미설정) */
  display_name: z.string().trim().max(50),
  /** IANA TZ id (서울/도쿄 등 — UI가 큐레이트한 목록 제공) */
  timezone: z.string().min(1),
});

/** profiles 표시 정보 수정 입력 */
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
