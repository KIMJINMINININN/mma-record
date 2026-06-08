import 'server-only';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';

import type { ReminderSchedulePayload } from '../model/reminder-bridge';

/**
 * 리마인더 브리지 진입 동기화용 서버 로더 — (app) 레이아웃이 호출해 현재 사용자의 설정을
 * WebViewReminderBridge initial로 내려준다(앱 진입 시 디바이스 스케줄 동기화).
 *
 * 도먼시(updateProfile/profile page 패턴 미러): 플래그 OFF면 Supabase 무접촉 →
 * 0023_reminder.sql 컬럼 default와 동일한 휴면 기본값(off / 요일 없음 / 저녁 7시) 반환.
 * 행 부재(아직 트리거 생성 전 등)도 동일 기본값으로 폴백한다(가짜 데이터 금지).
 */

/** 0023_reminder.sql 컬럼 default와 동일한 휴면 기본값. */
const DORMANT_REMINDER: ReminderSchedulePayload = { enabled: false, days: [], time: '19:00' };

export async function loadReminderForBridge(): Promise<ReminderSchedulePayload> {
  if (!isAuthEnabled()) return DORMANT_REMINDER;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return DORMANT_REMINDER;

  const { data: profile } = await supabase
    .from('profiles')
    .select('reminder_enabled, reminder_days, reminder_time')
    .eq('user_id', userId)
    .maybeSingle();
  if (!profile) return DORMANT_REMINDER;

  return {
    enabled: profile.reminder_enabled,
    days: profile.reminder_days,
    time: profile.reminder_time,
  };
}
