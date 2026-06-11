import * as Notifications from 'expo-notifications';

import type { MessageHandler, HandlerContext } from '../types';
import type { ReminderMessage } from '@the-others/webview-protocol';

// 훈련 리마인더(웹 → 네이티브) — 로컬 알림 MVP / 0023_reminder.sql.
//
// 방향: MMA 웹앱(WebView)이 자기 리마인더 설정(profiles.reminder_*)을 다음 메시지로 보낸다.
//   · 설정 동기화 → REMINDER_SCHEDULE { enabled, days, time }   (로그인 후 로드 시 + 저장 시)
// 네이티브는 이 값으로 expo-notifications 로컬 알림을 (재)스케줄한다(서버 푸시 아님 — 디바이스가 직접 건다).
//
// auth/media 핸들러와 달리 ctx 슬롯 위임이 아니라 **여기서 직접 스케줄**한다(리마인더는 본 기능의 산출물;
// auth/media는 토큰보관/picker가 별도 인프라라 슬롯에 위임). REMINDER_SCHEDULE 형태에만 타입 세이프하게 유지.
//
// 스케줄 규약:
//   1) requestPermissionsAsync() — 권한 없으면(거부) 조용히 종료(웹/앱에 별도 회신 없음).
//   2) cancelAllScheduledNotificationsAsync() — 항상 전체 취소 후 재구성(멱등; off 메시지면 취소만).
//   3) enabled면 days 각각에 weekly 반복 trigger 생성.
//      ⚠ expo-notifications weekday는 1=일 ~ 7=토. 웹은 0=일 ~ 6=토(JS getDay())로 보내므로 +1 변환.
//      time('HH:MM')은 hour/minute로 파싱(24h, 디바이스 로컬 시간).

const REMINDER_TITLE = '훈련할 시간이에요 🥋';
const REMINDER_BODY = '오늘도 한 세션 기록해볼까요?';

/** 'HH:MM' → { hour, minute }. 형식 불량(범위 밖 포함)이면 null(스케줄 건너뜀). */
function parseTime(time: string): { hour: number; minute: number } | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

/**
 * 웹 요일(0=일~6=토)을 expo-notifications weekday(1=일~7=토)로 변환.
 * 0~6 범위 밖은 무시(undefined 반환).
 */
function toExpoWeekday(day: number): number | undefined {
  if (!Number.isInteger(day) || day < 0 || day > 6) return undefined;
  return day + 1;
}

export function createReminderHandlers(_ctx: HandlerContext): Record<string, MessageHandler> {
  return {
    REMINDER_SCHEDULE: async (data) => {
      const msg = data as Extract<ReminderMessage, { mode: 'REMINDER_SCHEDULE' }>['data'];
      if (typeof msg?.enabled !== 'boolean' || !Array.isArray(msg?.days) || typeof msg?.time !== 'string') {
        console.warn('[reminder-handlers] REMINDER_SCHEDULE missing/invalid enabled/days/time');
        return;
      }

      // 권한 — 거부면 스케줄 불가(조용히 종료). off 메시지라도 권한 없이 cancel은 무해하나 일관되게 먼저 확인.
      const perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted && perm.status !== 'granted') {
        console.warn('[reminder-handlers] notification permission not granted');
        return;
      }

      // 멱등 재구성 — 항상 전체 취소 후 enabled일 때만 다시 건다.
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!msg.enabled) return;

      const time = parseTime(msg.time);
      if (!time) {
        console.warn('[reminder-handlers] invalid time (expected HH:MM):', msg.time);
        return;
      }

      // 요일별 weekly 반복 알림. 중복/범위밖 요일은 toExpoWeekday가 걸러낸다.
      const weekdays = Array.from(new Set(msg.days))
        .map(toExpoWeekday)
        .filter((w): w is number => w !== undefined);

      await Promise.all(
        weekdays.map((weekday) =>
          Notifications.scheduleNotificationAsync({
            content: { title: REMINDER_TITLE, body: REMINDER_BODY },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday,
              hour: time.hour,
              minute: time.minute,
              // Android 채널 분리(_layout에서 생성) — 시스템 설정에서 리마인더만 on/off 가능.
              channelId: 'reminders',
            },
          }),
        ),
      );
    },
  };
}
