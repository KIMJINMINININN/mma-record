// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';

/**
 * WebViewPushBridge — 푸시 토큰 등록 브리지(요청-응답)의 양방향 배선을 검증 (0026_push.sql).
 *
 * WebViewMediaBridge.test / WebViewAuthBridge.test 관용구: supabase client 를 mock(hoisted react 회피),
 * rpc 는 spy 로 둔다(register_push_token 인자 확인). RN 브릿지 유무로 no-op 분기도 검증한다.
 *   1) 마운트 시 PUSH_TOKEN_REQUEST postMessage(웹→네이티브 토큰 요청).
 *   2) PUSH_TOKEN_REGISTER 수신 → register_push_token RPC(인자 매핑) — rpc 는 microtask 로 resolve 하므로 waitFor.
 *   3) ReactNativeWebView 없으면 null 렌더 + postMessage/rpc 모두 미호출.
 */
const m = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/shared/api/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({ rpc: m.rpc }),
}));

import { WebViewPushBridge } from './WebViewPushBridge';

const postMessage = vi.fn();

/** native→web 'message' 디스패치 헬퍼(WebViewMediaBridge.test 와 동일). */
function dispatch(data: unknown) {
  window.dispatchEvent(new MessageEvent('message', { data }));
}

beforeEach(() => {
  m.rpc.mockReset();
  m.rpc.mockResolvedValue({ error: null });
  postMessage.mockClear();
  (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView = { postMessage };
});

afterEach(() => {
  cleanup();
  delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
});

describe('WebViewPushBridge', () => {
  it('마운트 시 PUSH_TOKEN_REQUEST 를 네이티브로 postMessage', () => {
    render(<WebViewPushBridge />);
    expect(postMessage).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(postMessage.mock.calls[0][0]) as { mode?: string };
    expect(parsed.mode).toBe('PUSH_TOKEN_REQUEST');
  });

  it('PUSH_TOKEN_REGISTER 수신 → register_push_token RPC(토큰/플랫폼 매핑)', async () => {
    render(<WebViewPushBridge />);
    dispatch(
      JSON.stringify({
        mode: 'PUSH_TOKEN_REGISTER',
        data: { token: 'ExponentPushToken[x]', platform: 'ios' },
      }),
    );
    await waitFor(() =>
      expect(m.rpc).toHaveBeenCalledWith('register_push_token', {
        p_token: 'ExponentPushToken[x]',
        p_platform: 'ios',
      }),
    );
  });

  it('ReactNativeWebView 없으면 null 렌더 + postMessage/rpc 미호출', () => {
    delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    const { container } = render(<WebViewPushBridge />);
    expect(container.firstChild).toBeNull();
    expect(postMessage).not.toHaveBeenCalled();
    // 리스너 미등록 → REGISTER 를 흘려보내도 rpc 안 불림.
    dispatch(JSON.stringify({ mode: 'PUSH_TOKEN_REGISTER', data: { token: 'x', platform: 'ios' } }));
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
