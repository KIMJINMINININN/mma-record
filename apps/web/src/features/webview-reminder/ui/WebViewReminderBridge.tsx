'use client';

import { useEffect } from 'react';
import type { ReminderMessage } from '@the-others/webview-protocol';

import {
  REMINDER_CHANGED_EVENT,
  type ReminderChangedEvent,
  type ReminderSchedulePayload,
} from '../model/reminder-bridge';

/**
 * WebViewReminderBridge — 웹의 리마인더 설정을 네이티브 앱(WebView)에 push (로컬 알림 MVP / 0023_reminder.sql).
 *
 * `window.ReactNativeWebView` 가 있을 때(앱 WebView 안)만 동작 — 일반 브라우저에선 no-op.
 * 전송 시점 두 가지:
 *   1) 마운트 시 — (app) 레이아웃이 서버에서 로드한 현재 설정(initial)을 1회 전송(앱 진입 동기화).
 *   2) 저장 시 — 편집 폼이 dispatch하는 REMINDER_CHANGED_EVENT를 구독해 최신 값 재전송.
 * 네이티브(apps/mobile)는 reminder-handlers → expo-notifications로 요일/시간 반복 로컬 알림을 스케줄한다.
 *
 * WebViewAuthBridge(onAuthStateChange→postMessage) 형제로 (app) 레이아웃에 전역 1회 마운트한다.
 * 인증(auth) 게이팅과 독립이다 — 설정 자체는 로그인 여부와 무관하게 디바이스 스케줄에 반영하면 되고,
 * 레이아웃이 auth ON일 때만 실제 DB 값을 initial로 내려준다(OFF면 기본값 휴면 — 전송해도 네이티브가 cancel만).
 */
declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

function postToNative(payload: ReminderSchedulePayload): void {
  if (typeof window === 'undefined' || !window.ReactNativeWebView) return;
  const message: ReminderMessage = { mode: 'REMINDER_SCHEDULE', data: payload };
  window.ReactNativeWebView.postMessage(JSON.stringify(message));
}

export function WebViewReminderBridge({ initial }: { initial: ReminderSchedulePayload }) {
  useEffect(() => {
    // 앱 WebView 안에서만(일반 브라우저 no-op).
    if (typeof window === 'undefined' || !window.ReactNativeWebView) return;

    // 1) 진입 동기화 — 현재 설정을 네이티브에 1회 push.
    postToNative(initial);

    // 2) 저장 시 재전송 — 편집 폼의 CustomEvent 구독.
    const onChanged = (e: Event) => {
      postToNative((e as ReminderChangedEvent).detail);
    };
    window.addEventListener(REMINDER_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(REMINDER_CHANGED_EVENT, onChanged);
    // 의도적으로 내용(enabled/days/time) 기준 deps — initial은 서버 fetch마다 새 객체라
    // 그대로 넣으면 매 렌더 재실행된다. days 배열도 신원이 아닌 길이/원소가 바뀔 때만 의미가 있어
    // 직렬화 키로 좁힌다(중복 push 방지). 핸들러는 클로저로 항상 최신 initial을 읽는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.enabled, initial.days.join(','), initial.time]);

  return null;
}
