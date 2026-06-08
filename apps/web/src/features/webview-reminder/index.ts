/**
 * features/webview-reminder 공개 API (FSD).
 * 웹 리마인더 설정 → 네이티브(WebView) push 브리지 + 저장 후 재전송 이벤트 헬퍼의 단일 진입점.
 * (app) 레이아웃이 WebViewReminderBridge를 마운트하고, edit-profile 폼이 emitReminderChanged를 호출한다.
 *
 * 서버 로더(api/load-reminder)는 배럴로 재노출하지 않는다(클라/서버 그래프에 server-only 누수 방지 —
 * 이 배럴은 클라이언트 섬 ProfileRankEditor가 emitReminderChanged 때문에 import 한다.
 * 레이아웃(서버)이 load-reminder를 직접 import. share-session 관용구와 동일).
 */
export { WebViewReminderBridge } from './ui/WebViewReminderBridge';
export {
  emitReminderChanged,
  REMINDER_CHANGED_EVENT,
  type ReminderSchedulePayload,
  type ReminderChangedEvent,
} from './model/reminder-bridge';
