/**
 * webview-reminder 브리지 공용 계약 — 웹이 자기 리마인더 설정을 네이티브(WebView)로 push할 때
 * 쓰는 타입/상수의 SSoT. 편집 폼(features/edit-profile)과 브리지 컴포넌트(WebViewReminderBridge)가
 * 직접 import 하지 않고 이 모듈의 CustomEvent로 느슨하게 연결된다(feature↔feature 결합 회피).
 *
 * 메시지 타입 자체는 packages/webview-protocol(ReminderMessage)이 단일 출처다 — 여기선 그 data 모양만 재사용.
 */
import type { ReminderMessage } from '@the-others/webview-protocol';

/** REMINDER_SCHEDULE 페이로드(enabled/days/time) — 프로토콜 메시지의 data 부분. */
export type ReminderSchedulePayload = ReminderMessage['data'];

/**
 * 저장 성공 시 편집 폼이 dispatch하는 window CustomEvent 이름.
 * WebViewReminderBridge가 구독해 최신 설정을 네이티브로 재전송한다(저장 직후 디바이스 스케줄 갱신).
 */
export const REMINDER_CHANGED_EVENT = 'mma:reminder-changed';

/** REMINDER_CHANGED_EVENT의 detail 타입 — dispatch/구독 양측이 공유. */
export type ReminderChangedEvent = CustomEvent<ReminderSchedulePayload>;

/**
 * 리마인더 설정이 바뀌었음을 브리지에 알린다(저장 성공 후 호출).
 * 브라우저(window) 밖(서버)에선 no-op. ReactNativeWebView 유무와 무관하게 항상 dispatch하고,
 * 실제 네이티브 전송 여부는 브리지가 판단한다(앱이 아니면 조용히 무시).
 */
export function emitReminderChanged(payload: ReminderSchedulePayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(REMINDER_CHANGED_EVENT, { detail: payload }));
}
