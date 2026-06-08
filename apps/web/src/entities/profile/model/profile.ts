import { z } from 'zod';
import { VISIBILITIES } from '@/shared/model/enums';
import { isoTimestamp } from '@/shared/lib/zod';

/**
 * 알림 시각 'HH:MM'(24h) 정규식 — 00:00 ~ 23:59.
 * profiles.reminder_time(text)와 WebView REMINDER_SCHEDULE.time이 공유하는 형식.
 */
const TIME_HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * 알림 요일 단건 — 0=일 ~ 6=토 (JS getDay()/dayjs day() 컨벤션, DB smallint[]와 일치).
 * (네이티브 expo-notifications weekday 1~7 변환은 모바일 핸들러 책임)
 */
const reminderDay = z.number().int().min(0).max(6);

/**
 * 프로필 모델 — `profiles` 테이블과 1:1 (마이그레이션 0003_profiles.sql + 0023_reminder.sql).
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
  /** 훈련 리마인더 on/off (기본 false). 로컬 알림 MVP — 0023_reminder.sql */
  reminder_enabled: z.boolean(),
  /** 알림 요일 0=일~6=토 (기본 []). 비면 알림 없음 */
  reminder_days: z.array(reminderDay),
  /** 알림 시각 'HH:MM' (기본 '19:00', 디바이스 로컬 시간 기준) */
  reminder_time: z.string().regex(TIME_HHMM_REGEX, 'HH:MM 형식이어야 합니다'),
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

/**
 * 리마인더 설정 수정 입력 (로컬 알림 MVP) — profiles의 reminder_* 3컬럼만.
 * 저장 액션 + WebView REMINDER_SCHEDULE 페이로드가 공유한다(웹이 네이티브로 push).
 * days는 0~6 범위 검증 후 중복 제거·오름차순 정규화한다(스케줄 안정성·멱등 비교).
 */
export const reminderUpdateSchema = z.object({
  /** 리마인더 on/off */
  reminder_enabled: z.boolean(),
  /** 알림 요일 0=일~6=토. 중복 제거 + 오름차순 정규화 */
  reminder_days: z
    .array(reminderDay)
    .transform((days) => Array.from(new Set(days)).sort((a, b) => a - b)),
  /** 알림 시각 'HH:MM' */
  reminder_time: z.string().regex(TIME_HHMM_REGEX, 'HH:MM 형식이어야 합니다'),
});

/** profiles 리마인더 설정 수정 입력 */
export type ReminderUpdate = z.infer<typeof reminderUpdateSchema>;
