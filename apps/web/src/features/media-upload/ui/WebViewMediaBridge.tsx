'use client';

import { useEffect } from 'react';
import { MEDIA_MESSAGE_MODES, type MediaMessage } from '@the-others/webview-protocol';

import { handleNativeMessage } from '../model/native-bridge';

/**
 * WebViewMediaBridge — 네이티브(Expo) → 웹 미디어 메시지 수신기 (E 트랙 / Develop §5).
 *
 * `window.ReactNativeWebView` 가 있을 때(앱 WebView 안)만 리스너 등록 — 일반 브라우저 no-op.
 * 네이티브가 `webviewRef.postMessage(...)` 로 보낸 MediaMessage(PICKED/UPLOAD_DONE/ERROR/CANCELED)를
 * 받아 native-bridge.handleNativeMessage 로 흘려보낸다(requestNativeCapture Promise를 resolve/reject).
 *
 * RN react-native-webview는 native→web postMessage를 iOS에선 `window`, Android에선 `document`의
 * 'message' 이벤트로 디스패치한다 — **양쪽 모두 등록**(크로스플랫폼 필수).
 * 메시지는 우리 origin(WebView가 CLIENT_URL만 로드, originWhitelist)에서만 오므로 별도 origin 검사 불필요;
 * 우리 프로토콜 mode 화이트리스트로 1차 필터한다.
 *
 * (app) 레이아웃에 WebViewAuthBridge 형제로 전역 1회 마운트한다.
 */
const MEDIA_MODES = new Set<string>(MEDIA_MESSAGE_MODES);

export function WebViewMediaBridge() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ReactNativeWebView) return;

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
      if (typeof mode !== 'string' || !MEDIA_MODES.has(mode)) return; // 미디어 메시지만
      handleNativeMessage(parsed as MediaMessage);
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
