// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';

/**
 * WebViewAuthBridge — onAuthStateChange → AuthMessage postMessage 핸드오프 검증.
 * supabase client/env 를 mock(hoisted react 회피). onAuthStateChange 는 콜백을 캡처해
 * 테스트가 직접 (event, session)을 흘려보낸다. ReactNativeWebView 유무로 no-op 분기도 검증.
 */
const m = vi.hoisted(() => ({
  isAuthEnabled: vi.fn(() => true),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('@/shared/api/supabase/env', () => ({ isAuthEnabled: m.isAuthEnabled }));
vi.mock('@/shared/api/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({ auth: { onAuthStateChange: m.onAuthStateChange } }),
}));

import { WebViewAuthBridge } from './WebViewAuthBridge';

type AuthCb = (event: string, session: unknown) => void;
const postMessage = vi.fn();

/** onAuthStateChange mock 이 등록한 콜백을 캡처(구독 핸들 반환). */
function captureCallback(): () => AuthCb | null {
  let cb: AuthCb | null = null;
  m.onAuthStateChange.mockImplementation((fn: AuthCb) => {
    cb = fn;
    return { data: { subscription: { unsubscribe: m.unsubscribe } } };
  });
  return () => cb;
}

beforeEach(() => {
  m.isAuthEnabled.mockReturnValue(true);
  m.onAuthStateChange.mockReset();
  m.unsubscribe.mockClear();
  postMessage.mockClear();
  (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView = { postMessage };
});

afterEach(() => {
  cleanup();
  delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
});

describe('WebViewAuthBridge', () => {
  it('ReactNativeWebView 없으면 no-op(구독 안 함)', () => {
    delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    render(<WebViewAuthBridge />);
    expect(m.onAuthStateChange).not.toHaveBeenCalled();
  });

  it('AUTH OFF면 no-op', () => {
    m.isAuthEnabled.mockReturnValue(false);
    render(<WebViewAuthBridge />);
    expect(m.onAuthStateChange).not.toHaveBeenCalled();
  });

  it('SIGNED_IN → AUTH_LOGIN postMessage(provider + access 토큰)', () => {
    const getCb = captureCallback();
    render(<WebViewAuthBridge />);
    getCb()!('SIGNED_IN', {
      access_token: 'tok123',
      refresh_token: 'ref',
      user: { app_metadata: { provider: 'email' } },
    });
    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({ mode: 'AUTH_LOGIN', data: { provider: 'email', credential: 'tok123' } }),
    );
  });

  it('SIGNED_OUT(또는 세션 없음) → AUTH_LOGOUT', () => {
    const getCb = captureCallback();
    render(<WebViewAuthBridge />);
    getCb()!('SIGNED_OUT', null);
    expect(postMessage).toHaveBeenCalledWith(JSON.stringify({ mode: 'AUTH_LOGOUT' }));
  });

  it('TOKEN_REFRESHED → AUTH_TOKEN_REFRESH(refresh 토큰)', () => {
    const getCb = captureCallback();
    render(<WebViewAuthBridge />);
    getCb()!('TOKEN_REFRESHED', {
      access_token: 'a',
      refresh_token: 'ref456',
      user: { app_metadata: {} },
    });
    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({ mode: 'AUTH_TOKEN_REFRESH', data: { refreshToken: 'ref456' } }),
    );
  });

  it('INITIAL_SESSION → AUTH_LOGIN (앱 첫 로드 기존 세션 핸드오프)', () => {
    const getCb = captureCallback();
    render(<WebViewAuthBridge />);
    getCb()!('INITIAL_SESSION', {
      access_token: 'init-tok',
      refresh_token: 'r',
      user: { app_metadata: { provider: 'email' } },
    });
    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({ mode: 'AUTH_LOGIN', data: { provider: 'email', credential: 'init-tok' } }),
    );
  });

  it('TOKEN_REFRESHED + refresh_token 없음 → postMessage 안 함(no-op)', () => {
    const getCb = captureCallback();
    render(<WebViewAuthBridge />);
    getCb()!('TOKEN_REFRESHED', { access_token: 'a', user: { app_metadata: {} } });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('언마운트 시 구독 해제', () => {
    captureCallback();
    const { unmount } = render(<WebViewAuthBridge />);
    unmount();
    expect(m.unsubscribe).toHaveBeenCalled();
  });
});
