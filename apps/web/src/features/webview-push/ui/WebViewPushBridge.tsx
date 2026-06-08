'use client';

import { useEffect } from 'react';
import { PUSH_TOKEN_MESSAGE_MODES, type PushTokenMessage } from '@the-others/webview-protocol';

import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';

/**
 * WebViewPushBridge — 서버 푸시 토큰 등록 브리지 (서버 푸시 / 0026_push.sql).
 *
 * `window.ReactNativeWebView` 가 있을 때(앱 WebView 안)만 동작 — 일반 브라우저에선 no-op.
 * 방향(요청-응답, 웹 주도):
 *   1) 마운트 시 — 네이티브에 PUSH_TOKEN_REQUEST 1회 송신(토큰 달라고 요청).
 *   2) 수신 — 네이티브가 expo-notifications 권한+getExpoPushTokenAsync로 얻은 토큰을 PUSH_TOKEN_REGISTER로 회신하면
 *      register_push_token RPC로 upsert. projectId/권한/디바이스 없으면 네이티브가 조용히 스킵(회신 없음 = 휴면).
 *
 * 수신 리스너는 WebViewMediaBridge와 동일 배선 — RN react-native-webview는 native→web postMessage를
 * iOS=window, Android=document의 'message' 이벤트로 디스패치하므로 **양쪽 모두 등록**(크로스플랫폼 필수).
 * 메시지는 우리 origin(WebView가 CLIENT_URL만 로드, originWhitelist)에서만 오므로 origin 검사 불필요; mode 화이트리스트로 1차 필터.
 *
 * (app) 레이아웃 안(인증됨)에 마운트되므로 RPC 실행 시 세션이 있다 — 그래도 도먼시/세션 경계 엣지는
 * 조용히 무시한다(토스트 없음, console.warn만). WebViewReminderBridge/WebViewMediaBridge 형제로 전역 1회 마운트한다.
 */
declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

const PUSH_MODES = new Set<string>(PUSH_TOKEN_MESSAGE_MODES);

export function WebViewPushBridge() {
  useEffect(() => {
    // 앱 WebView 안에서만(일반 브라우저 no-op).
    if (typeof window === 'undefined' || !window.ReactNativeWebView) return;

    // 1) 마운트 시 — 네이티브에 토큰 요청 1회 송신.
    const request: PushTokenMessage = { mode: 'PUSH_TOKEN_REQUEST' };
    window.ReactNativeWebView.postMessage(JSON.stringify(request));

    // 2) 수신 — 네이티브가 회신한 PUSH_TOKEN_REGISTER 를 받아 register_push_token RPC upsert.
    const onMessage = (event: Event) => {
      const raw = (event as MessageEvent).data;
      if (typeof raw !== 'string') return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return; // 비-JSON(다른 메시지) — 무시
      }
      if (!parsed || typeof parsed !== 'object') return;
      const mode = (parsed as { mode?: unknown }).mode;
      if (typeof mode !== 'string' || !PUSH_MODES.has(mode)) return; // 푸시 메시지만
      if (mode !== 'PUSH_TOKEN_REGISTER') return; // PUSH_TOKEN_REQUEST = 웹이 보낸 것 → 무시

      const data = (parsed as Extract<PushTokenMessage, { mode: 'PUSH_TOKEN_REGISTER' }>).data;
      if (!data || typeof data.token !== 'string' || !data.token) return;

      // 도먼시/세션 경계 엣지에선 RPC가 실패할 수 있다 — 조용히 무시(토스트 없음).
      // supabase rpc 는 PromiseLike(PostgrestBuilder)라 .catch 가 없어 then 의 2번째 콜백으로 reject 를 받는다.
      void createSupabaseBrowserClient()
        .rpc('register_push_token', { p_token: data.token, p_platform: data.platform ?? '' })
        .then(
          ({ error }) => {
            if (error) console.warn('[WebViewPushBridge] register_push_token failed:', error.message);
          },
          (e: unknown) => console.warn('[WebViewPushBridge] register_push_token threw:', e),
        );
    };

    window.addEventListener('message', onMessage);
    document.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      document.removeEventListener('message', onMessage);
    };
  }, []);

  return null;
}
