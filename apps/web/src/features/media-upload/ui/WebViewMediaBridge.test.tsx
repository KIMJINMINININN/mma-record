// @vitest-environment jsdom
/**
 * WebViewMediaBridge — 네이티브→웹 메시지 수신/라우팅 검증.
 * handleNativeMessage 를 mock 하고 window 'message' 이벤트를 흘려보내,
 * RN 브릿지 유무 게이트 · 미디어 모드 필터 · 비-JSON 방어 · 언마운트 정리를 확인한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const m = vi.hoisted(() => ({ handleNativeMessage: vi.fn() }));
vi.mock('../model/native-bridge', () => ({ handleNativeMessage: m.handleNativeMessage }));

import { WebViewMediaBridge } from './WebViewMediaBridge';

beforeEach(() => {
  m.handleNativeMessage.mockReset();
  (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView = { postMessage: vi.fn() };
});
afterEach(() => {
  cleanup();
  delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
});

function dispatch(data: unknown) {
  window.dispatchEvent(new MessageEvent('message', { data }));
}

describe('WebViewMediaBridge', () => {
  it('ReactNativeWebView 없으면 리스너 미등록(메시지 무시)', () => {
    delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    render(<WebViewMediaBridge />);
    dispatch(JSON.stringify({ mode: 'MEDIA_UPLOAD_DONE', data: { requestId: 'x' } }));
    expect(m.handleNativeMessage).not.toHaveBeenCalled();
  });

  it('미디어 메시지(JSON 문자열) → handleNativeMessage 호출', () => {
    render(<WebViewMediaBridge />);
    const msg = {
      mode: 'MEDIA_PICKED',
      data: { requestId: 'r1', fileName: 'a.mp4', mime: 'video/mp4', sizeBytes: 1, durationSec: null, isImage: false },
    };
    dispatch(JSON.stringify(msg));
    expect(m.handleNativeMessage).toHaveBeenCalledWith(msg);
  });

  it('미디어 모드가 아니면(PONG 등) 무시', () => {
    render(<WebViewMediaBridge />);
    dispatch(JSON.stringify({ mode: 'PONG', data: {} }));
    expect(m.handleNativeMessage).not.toHaveBeenCalled();
  });

  it('비-JSON 문자열 → 무시(throw 없음)', () => {
    render(<WebViewMediaBridge />);
    dispatch('not json');
    expect(m.handleNativeMessage).not.toHaveBeenCalled();
  });

  it('비-문자열 data → 무시', () => {
    render(<WebViewMediaBridge />);
    dispatch({ mode: 'MEDIA_PICKED' });
    expect(m.handleNativeMessage).not.toHaveBeenCalled();
  });

  it('언마운트 시 리스너 제거(이후 메시지 무시)', () => {
    const { unmount } = render(<WebViewMediaBridge />);
    unmount();
    dispatch(JSON.stringify({ mode: 'MEDIA_UPLOAD_DONE', data: { requestId: 'x' } }));
    expect(m.handleNativeMessage).not.toHaveBeenCalled();
  });
});
