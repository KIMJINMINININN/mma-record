import type { MessageHandler, HandlerContext } from '../types';
import type { AuthMessage } from '@the-others/webview-protocol';

// 인증 핸드오프(웹 → 네이티브) — SCAFFOLD / DORMANT.
//
// 방향: MMA 웹앱이 로그인/로그아웃/토큰 갱신 시 다음 메시지를
//   `window.ReactNativeWebView.postMessage(JSON.stringify({ mode, data }))`로 네이티브에 보낸다.
//     · 로그인 성공  → AUTH_LOGIN { provider, credential }  (access/refresh 토큰 핸드오프)
//     · 로그아웃     → AUTH_LOGOUT
//     · 토큰 만료    → AUTH_TOKEN_REFRESH { refreshToken }
//   (웹 측 송신부는 인증이 env-gated라 현재 휴면 상태 — Develop §10/§5)
//
// 네이티브는 여기서 토큰을 받아 보관해야 하지만,
//   토큰 보관(expo-secure-store 연동)은 인프라/P1 단계다 (Develop §9·§10).
//   따라서 실제 영속화는 구현하지 않고, ctx.auth.* 콜백 슬롯에만 위임한다
//   (해당 슬롯도 구체 구현이 꽂히기 전까지 optional/undefined).
// AuthMessage 형태에 대해서만 타입 세이프하게 유지한다 — SDK glue/토큰 필드명 추가 금지.

export function createAuthHandlers(ctx: HandlerContext): Record<string, MessageHandler> {
  return {
    AUTH_LOGIN: async (data) => {
      const msg = data as Extract<AuthMessage, { mode: 'AUTH_LOGIN' }>['data'];
      if (!msg?.provider || !msg?.credential) {
        console.warn('[auth-handlers] AUTH_LOGIN missing provider/credential');
        return;
      }
      await ctx.auth?.onLogin?.(msg);
    },

    AUTH_LOGOUT: async () => {
      await ctx.auth?.onLogout?.();
    },

    AUTH_TOKEN_REFRESH: async (data) => {
      const msg = data as Extract<AuthMessage, { mode: 'AUTH_TOKEN_REFRESH' }>['data'];
      if (!msg?.refreshToken) {
        console.warn('[auth-handlers] AUTH_TOKEN_REFRESH missing refreshToken');
        return;
      }
      await ctx.auth?.onTokenRefresh?.(msg);
    },
  };
}
