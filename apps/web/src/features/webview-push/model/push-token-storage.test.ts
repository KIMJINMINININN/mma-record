// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * push-token-storage — 로그아웃 시 푸시 토큰 해제(0035)의 보관/해제 규약 검증.
 * WebViewPushBridge.test 관용구: supabase client mock + rpc spy.
 *   1) 보관된 토큰 → unregister_push_token RPC + 보관 제거.
 *   2) 토큰 없음(브라우저/유실) → RPC 미호출(no-op).
 *   3) RPC 실패 → 보관 유지(다음 기회에 재시도 가능) + 흐름은 throw 없이 종료.
 */
const m = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/shared/api/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({ rpc: m.rpc }),
}));

import { rememberPushToken, unregisterStoredPushToken } from './push-token-storage';

const KEY = 'matlog.push-token';

beforeEach(() => {
  m.rpc.mockReset();
  m.rpc.mockResolvedValue({ error: null });
  sessionStorage.clear();
});

describe('push-token-storage', () => {
  it('보관된 토큰을 unregister_push_token RPC로 해제하고 보관을 비운다', async () => {
    rememberPushToken('ExponentPushToken[a]');
    expect(sessionStorage.getItem(KEY)).toBe('ExponentPushToken[a]');

    await unregisterStoredPushToken();

    expect(m.rpc).toHaveBeenCalledWith('unregister_push_token', { p_token: 'ExponentPushToken[a]' });
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('보관된 토큰이 없으면 RPC를 호출하지 않는다(no-op)', async () => {
    await unregisterStoredPushToken();
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it('RPC 실패 시 보관을 유지하고 throw 하지 않는다(로그아웃 흐름 비차단)', async () => {
    m.rpc.mockResolvedValue({ error: { message: 'boom' } });
    rememberPushToken('ExponentPushToken[b]');

    await expect(unregisterStoredPushToken()).resolves.toBeUndefined();
    expect(sessionStorage.getItem(KEY)).toBe('ExponentPushToken[b]');
  });
});
