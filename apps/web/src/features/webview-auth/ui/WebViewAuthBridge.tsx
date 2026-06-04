'use client';

import { useEffect } from 'react';
import type { AuthMessage } from '@the-others/webview-protocol';

import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import { isAuthEnabled } from '@/shared/api/supabase/env';

/**
 * WebViewAuthBridge — 웹 로그인 상태를 네이티브 앱(WebView)에 핸드오프 (E-AUTH / Develop §10).
 *
 * `window.ReactNativeWebView` 가 있을 때(앱 WebView 안)만 동작 — 일반 브라우저에선 no-op.
 * supabase `onAuthStateChange` 구독 → AuthMessage 를 postMessage:
 *   SIGNED_IN / INITIAL_SESSION → AUTH_LOGIN { provider, credential=access_token }
 *   TOKEN_REFRESHED            → AUTH_TOKEN_REFRESH { refreshToken }
 *   SIGNED_OUT(또는 세션 없음)  → AUTH_LOGOUT
 * 앱(apps/mobile)은 auth-handlers → SecureStore 로 토큰을 보관한다(토큰 사용처=네이티브 API는 후속).
 * AUTH OFF(인프라 전)면 Supabase 무접촉. 표시 없음(null).
 */
declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

function postToNative(message: AuthMessage): void {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}

export function WebViewAuthBridge() {
  useEffect(() => {
    // 앱 WebView 안에서만(일반 브라우저 no-op) + 인증 활성일 때만.
    if (typeof window === 'undefined' || !window.ReactNativeWebView || !isAuthEnabled()) return;

    const supabase = createSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || event === 'SIGNED_OUT') {
        postToNative({ mode: 'AUTH_LOGOUT' });
        return;
      }
      if (event === 'TOKEN_REFRESHED') {
        if (session.refresh_token) {
          postToNative({ mode: 'AUTH_TOKEN_REFRESH', data: { refreshToken: session.refresh_token } });
        }
        return;
      }
      // SIGNED_IN · INITIAL_SESSION — access 토큰 핸드오프.
      postToNative({
        mode: 'AUTH_LOGIN',
        data: {
          provider: session.user.app_metadata.provider ?? 'email',
          credential: session.access_token,
        },
      });
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return null;
}
