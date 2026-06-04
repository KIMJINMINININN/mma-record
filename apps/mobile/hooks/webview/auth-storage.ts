import * as SecureStore from 'expo-secure-store';
import type { AuthMessage } from '@the-others/webview-protocol';

/**
 * 인증 토큰 보관 (E-AUTH / Develop §9·§10) — expo-secure-store 기반.
 *
 * 웹(WebView)이 로그인/로그아웃/토큰갱신 시 보내는 AuthMessage 를 받아(auth-handlers → ctx.auth)
 * 네이티브 보안 저장소에 access 토큰을 보관/삭제한다. 이 토큰은 후속(네이티브 API·미디어 업로드 등)에서
 * Authorization 헤더로 쓰일 예정 — 현재는 보관까지만(사용처는 P1 후속).
 *
 * 키는 앱 식별 prefix. SecureStore 값 한도(iOS ~2KB)는 JWT access 토큰에 충분.
 */
const ACCESS_KEY = 'matlog.access_token';
const PROVIDER_KEY = 'matlog.auth_provider';
const REFRESH_KEY = 'matlog.refresh_token';

type LoginPayload = Extract<AuthMessage, { mode: 'AUTH_LOGIN' }>['data'];

/** 로그인 핸드오프 — access 토큰 + provider 보관. */
export async function saveSession(payload: LoginPayload): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, payload.credential);
  await SecureStore.setItemAsync(PROVIDER_KEY, payload.provider);
}

/** 로그아웃 — 보관 토큰 전부 삭제. */
export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(PROVIDER_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

/** 토큰 갱신 — refresh 토큰 보관(세션 복원 후속용). */
export async function updateRefreshToken(refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

/** 보관된 access 토큰 조회(없으면 null) — 네이티브 API 호출부(후속)에서 사용. */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY);
}
