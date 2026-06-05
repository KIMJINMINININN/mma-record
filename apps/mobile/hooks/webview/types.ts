import { RefObject } from 'react';
import WebView from 'react-native-webview';
import type { MediaSource, WebviewMessageType } from '@the-others/webview-protocol';

// 공통 프로토콜 타입(WebviewMessageType, AuthMessage)은 packages/webview-protocol에서 import.
// HandlerContext / MessageHandler는 RN 전용이라 여기 남아있음.

export type HandlerContext = {
  sendToWebview: (msg: WebviewMessageType) => void;
  webviewRef: RefObject<WebView | null>;
  // NEW — optional slots; absent until concrete implementations are plugged in (Phase 2.4+)
  auth?: {
    onLogin?: (payload: { provider: string; credential: string }) => void | Promise<void>;
    onLogout?: () => void | Promise<void>;
    onTokenRefresh?: (payload: { refreshToken: string }) => void | Promise<void>;
  };
  // 미디어 캡처(E 트랙) — 웹 촬영/갤러리 요청 → 네이티브 picker, 서명URL 직접 PUT.
  // 구체 구현(expo-image-picker / expo-file-system)은 webview-screen에서 media-capture로 꽂는다.
  media?: {
    onPickRequest?: (req: {
      requestId: string;
      source: MediaSource;
      mediaTypes: ('image' | 'video')[];
      limits: { maxBytes: number; maxDurationSec: number };
    }) => void | Promise<void>;
    onUploadTicket?: (ticket: {
      requestId: string;
      uploadUrl: string;
      mime: string;
    }) => void | Promise<void>;
  };
  navigation?: {
    // Reserved for future router integration (Phase 2.4+)
    push?: (route: string, params?: Record<string, unknown>) => void;
  };
};

export type MessageHandler = (
  data: any,
  ctx: HandlerContext,
  mode: string,
) => Promise<void>;
