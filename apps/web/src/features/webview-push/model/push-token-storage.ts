import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';

/**
 * push-token-storage — 이 디바이스(WebView)의 등록된 푸시 토큰 보관 + 로그아웃 시 해제 (0035).
 *
 * WebViewPushBridge가 register_push_token 성공 시 rememberPushToken으로 보관하고,
 * LogoutButton이 로그아웃 직전 unregisterStoredPushToken으로 해제한다(베스트 에포트 —
 * 실패해도 로그아웃은 진행; 다음 계정 로그인 시 on-conflict 소유이전이 백스톱).
 *
 * sessionStorage 선택 이유: 같은 WebView 세션 안에서 라우트 이동/리로드를 견디면 충분하고,
 * 앱 프로세스 종료와 함께 사라져도 무해(보관 유실 = 해제 no-op = 기존 동작). 브라우저(비 WebView)에선
 * 토큰 등록 자체가 없으므로 항상 no-op.
 */
const STORAGE_KEY = 'matlog.push-token';

/** 등록 성공한 디바이스 토큰을 보관한다(로그아웃 시 해제용). 저장 불가 환경은 조용히 무시. */
export function rememberPushToken(token: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // sessionStorage 비가용(프라이빗 모드 등) — 해제만 못 할 뿐 등록 동작엔 영향 없음.
  }
}

/**
 * 보관된 토큰을 unregister_push_token RPC로 해제하고 보관을 비운다.
 * 토큰이 없으면(브라우저/유실) no-op. RPC 실패는 console.warn만 — 로그아웃 흐름을 막지 않는다.
 */
export async function unregisterStoredPushToken(): Promise<void> {
  let token: string | null = null;
  try {
    token = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!token) return;

  try {
    const { error } = await createSupabaseBrowserClient().rpc('unregister_push_token', {
      p_token: token,
    });
    if (error) {
      console.warn('[push-token-storage] unregister_push_token failed:', error.message);
      return;
    }
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[push-token-storage] unregister_push_token threw:', e);
  }
}
