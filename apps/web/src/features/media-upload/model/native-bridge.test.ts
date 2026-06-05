// @vitest-environment jsdom
/**
 * native-bridge — 네이티브 촬영/갤러리 ↔ 서명URL 직접 업로드 오케스트레이션 검증 (E 트랙).
 *
 * window.ReactNativeWebView.postMessage 와 fetch(sign-upload)를 mock 하고,
 * 네이티브→웹 메시지를 handleNativeMessage 로 흘려보내 requestNativeCapture Promise의
 * resolve/reject 와 프로토콜 메시지(REQUEST/TICKET) 송신을 검증한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MediaMessage } from '@the-others/webview-protocol';

import {
  requestNativeCapture,
  isNativeBridgeAvailable,
  handleNativeMessage,
  __resetNativeBridgeForTest,
} from './native-bridge';

const postMessage = vi.fn();

function postedOfMode(mode: string): MediaMessage | undefined {
  for (let i = postMessage.mock.calls.length - 1; i >= 0; i -= 1) {
    const m = JSON.parse(postMessage.mock.calls[i][0] as string) as MediaMessage;
    if (m.mode === mode) return m;
  }
  return undefined;
}
function requestIdOf(): string {
  const req = postedOfMode('MEDIA_PICK_REQUEST');
  return (req?.data as { requestId: string }).requestId;
}
function okFetch(path: string, signedUrl: string) {
  return vi.fn((_input: string, _init: { body: string }) =>
    Promise.resolve({ ok: true, json: async () => ({ path, token: 'tok', signedUrl }) }),
  );
}

beforeEach(() => {
  postMessage.mockReset();
  (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView = { postMessage };
  __resetNativeBridgeForTest();
});
afterEach(() => {
  __resetNativeBridgeForTest();
  delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('isNativeBridgeAvailable', () => {
  it('ReactNativeWebView 있으면 true', () => {
    expect(isNativeBridgeAvailable()).toBe(true);
  });
  it('없으면 false', () => {
    delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    expect(isNativeBridgeAvailable()).toBe(false);
  });
});

describe('requestNativeCapture — happy path', () => {
  it('영상: PICK_REQUEST → PICKED → sign-upload(kind=video) → TICKET → DONE → native-upload draft', async () => {
    const signedUrl = 'https://sb.co/storage/v1/object/upload/sign/training-media/u1/videos/abc.mp4?token=tok';
    const fetchMock = okFetch('u1/videos/abc.mp4', signedUrl);
    vi.stubGlobal('fetch', fetchMock);

    const p = requestNativeCapture('camera');
    const req = postedOfMode('MEDIA_PICK_REQUEST')!;
    expect(req).toBeTruthy();
    expect((req.data as { source: string }).source).toBe('camera');
    const requestId = requestIdOf();

    handleNativeMessage({
      mode: 'MEDIA_PICKED',
      data: { requestId, fileName: 'clip.mp4', mime: 'video/mp4', sizeBytes: 1024, durationSec: 30, isImage: false },
    });

    await vi.waitFor(() => expect(postedOfMode('MEDIA_UPLOAD_TICKET')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith('/api/media/sign-upload', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ kind: 'video', mime: 'video/mp4', size: 1024, duration: 30 });
    expect((postedOfMode('MEDIA_UPLOAD_TICKET')!.data as { uploadUrl: string }).uploadUrl).toBe(signedUrl);

    handleNativeMessage({ mode: 'MEDIA_UPLOAD_DONE', data: { requestId } });
    await expect(p).resolves.toEqual({
      kind: 'native-upload',
      storagePath: 'u1/videos/abc.mp4',
      mime: 'video/mp4',
      sizeBytes: 1024,
      durationSec: 30,
      isImage: false,
      fileName: 'clip.mp4',
    });
  });

  it('사진: sign-upload kind=image, duration 미포함', async () => {
    const fetchMock = okFetch('u1/images/x.jpg', 'https://sb.co/storage/v1/object/upload/sign/training-media/u1/images/x.jpg?token=t');
    vi.stubGlobal('fetch', fetchMock);

    const p = requestNativeCapture('library');
    const requestId = requestIdOf();
    handleNativeMessage({
      mode: 'MEDIA_PICKED',
      data: { requestId, fileName: 'p.jpg', mime: 'image/jpeg', sizeBytes: 2048, durationSec: null, isImage: true },
    });
    await vi.waitFor(() => expect(postedOfMode('MEDIA_UPLOAD_TICKET')).toBeTruthy());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.kind).toBe('image');
    expect('duration' in body).toBe(false); // isImage → duration 생략(JSON에서 빠짐)

    handleNativeMessage({ mode: 'MEDIA_UPLOAD_DONE', data: { requestId } });
    const draft = await p;
    expect(draft).toMatchObject({ isImage: true, storagePath: 'u1/images/x.jpg' });
  });
});

describe('requestNativeCapture — reject paths', () => {
  it('WebView 밖 → reject(canceled:false), 메시지 송신 없음', async () => {
    delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    await expect(requestNativeCapture('camera')).rejects.toMatchObject({ canceled: false });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('MEDIA_PICK_CANCELED → reject(canceled:true), sign-upload 미호출', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const p = requestNativeCapture('camera');
    handleNativeMessage({ mode: 'MEDIA_PICK_CANCELED', data: { requestId: requestIdOf() } });
    await expect(p).rejects.toMatchObject({ canceled: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('영상 용량 초과 → reject, sign-upload 미호출', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const p = requestNativeCapture('library');
    handleNativeMessage({
      mode: 'MEDIA_PICKED',
      data: { requestId: requestIdOf(), fileName: 'big.mp4', mime: 'video/mp4', sizeBytes: 9_999_999_999, durationSec: 10, isImage: false },
    });
    await expect(p).rejects.toMatchObject({ canceled: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('영상 길이 초과 → reject, sign-upload 미호출', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const p = requestNativeCapture('library');
    handleNativeMessage({
      mode: 'MEDIA_PICKED',
      data: { requestId: requestIdOf(), fileName: 'long.mp4', mime: 'video/mp4', sizeBytes: 1024, durationSec: 99999, isImage: false },
    });
    await expect(p).rejects.toMatchObject({ canceled: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('지원하지 않는 형식(heic) → reject, sign-upload 미호출', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const p = requestNativeCapture('library');
    handleNativeMessage({
      mode: 'MEDIA_PICKED',
      data: { requestId: requestIdOf(), fileName: 'p.heic', mime: 'image/heic', sizeBytes: 100, durationSec: null, isImage: true },
    });
    await expect(p).rejects.toMatchObject({ canceled: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sign-upload 실패 → reject(서버 메시지), TICKET 미송신', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({ error: '한도 초과(서버)' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const p = requestNativeCapture('camera');
    handleNativeMessage({
      mode: 'MEDIA_PICKED',
      data: { requestId: requestIdOf(), fileName: 'c.mp4', mime: 'video/mp4', sizeBytes: 1024, durationSec: 5, isImage: false },
    });
    await expect(p).rejects.toMatchObject({ canceled: false, message: '한도 초과(서버)' });
    expect(postedOfMode('MEDIA_UPLOAD_TICKET')).toBeUndefined();
  });

  it('네이티브 업로드 실패(MEDIA_UPLOAD_ERROR) → reject(메시지)', async () => {
    const fetchMock = okFetch('u1/videos/a.mp4', 'https://sb.co/storage/v1/object/upload/sign/training-media/u1/videos/a.mp4?token=t');
    vi.stubGlobal('fetch', fetchMock);
    const p = requestNativeCapture('camera');
    const requestId = requestIdOf();
    handleNativeMessage({
      mode: 'MEDIA_PICKED',
      data: { requestId, fileName: 'c.mp4', mime: 'video/mp4', sizeBytes: 1024, durationSec: 5, isImage: false },
    });
    await vi.waitFor(() => expect(postedOfMode('MEDIA_UPLOAD_TICKET')).toBeTruthy());
    handleNativeMessage({ mode: 'MEDIA_UPLOAD_ERROR', data: { requestId, message: '네트워크 오류' } });
    await expect(p).rejects.toMatchObject({ canceled: false, message: '네트워크 오류' });
  });
});

describe('타임아웃 레이스 — 고아 업로드 방지', () => {
  it('PICKED 후 sign-upload 대기 중 타임아웃 → TICKET 미송신 + reject(가드)', async () => {
    vi.useFakeTimers();
    // fetch가 끝나지 않게 deferred — 타임아웃이 먼저 발동하도록.
    let resolveFetch!: (v: { ok: boolean; json: () => Promise<unknown> }) => void;
    const fetchMock = vi.fn(
      () => new Promise<{ ok: boolean; json: () => Promise<unknown> }>((r) => { resolveFetch = r; }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const p = requestNativeCapture('camera');
    p.catch(() => {}); // unhandled rejection 방지
    const requestId = requestIdOf();
    handleNativeMessage({
      mode: 'MEDIA_PICKED',
      data: { requestId, fileName: 'c.mp4', mime: 'video/mp4', sizeBytes: 1024, durationSec: 5, isImage: false },
    });

    // onPicked가 fetch를 await 중 — 캡처 타임아웃(6분) 발동(cleanup + reject).
    await vi.advanceTimersByTimeAsync(6 * 60 * 1000 + 1);
    // 늦게 도착한 fetch 응답: 가드(pending.has 체크)로 티켓을 보내면 안 된다(고아 업로드 방지).
    resolveFetch({
      ok: true,
      json: async () => ({ path: 'u1/videos/x.mp4', token: 't', signedUrl: 'https://sb/upload/sign/x?token=t' }),
    });
    await vi.advanceTimersByTimeAsync(1);

    expect(postedOfMode('MEDIA_UPLOAD_TICKET')).toBeUndefined();
    await expect(p).rejects.toMatchObject({ canceled: false });
  });
});

describe('업로드 윈도우 재시작 — 픽 소요와 타임아웃 분리', () => {
  it('픽이 5분 걸려도 티켓 핸드오프 후 윈도우 재시작 → 누적 10분 DONE도 resolve(고아 방지)', async () => {
    vi.useFakeTimers();
    const fetchMock = okFetch('u1/videos/x.mp4', 'https://sb.co/storage/v1/object/upload/sign/training-media/u1/videos/x.mp4?token=t');
    vi.stubGlobal('fetch', fetchMock);

    const p = requestNativeCapture('camera');
    const requestId = requestIdOf();
    // 사용자가 픽에 5분 소요(원래 6분 타임아웃 직전).
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    handleNativeMessage({
      mode: 'MEDIA_PICKED',
      data: { requestId, fileName: 'c.mp4', mime: 'video/mp4', sizeBytes: 1024, durationSec: 5, isImage: false },
    });
    // sign-upload 완료 → 티켓 송신 + 타임아웃 재시작.
    await vi.advanceTimersByTimeAsync(10);
    expect(postedOfMode('MEDIA_UPLOAD_TICKET')).toBeTruthy();

    // 티켓 이후 추가 5분(누적 ~10분) — 원래 6분 타임아웃은 지났지만 재시작 윈도우는 유효해야 함.
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    handleNativeMessage({ mode: 'MEDIA_UPLOAD_DONE', data: { requestId } });
    await expect(p).resolves.toMatchObject({ storagePath: 'u1/videos/x.mp4' });
  });
});

describe('handleNativeMessage — robustness', () => {
  it('알 수 없는 requestId의 메시지는 무시(throw 없음)', () => {
    expect(() => handleNativeMessage({ mode: 'MEDIA_UPLOAD_DONE', data: { requestId: 'nope' } })).not.toThrow();
    expect(() => handleNativeMessage({ mode: 'MEDIA_PICK_CANCELED', data: { requestId: 'nope' } })).not.toThrow();
  });
});
