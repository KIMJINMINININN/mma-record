/**
 * native-bridge — 네이티브(Expo) 촬영/갤러리 ↔ 웹 미디어 업로드 오케스트레이션 (E 트랙 / Develop §5).
 *
 * WebView 안에서만 동작(`window.ReactNativeWebView` 존재). 일반 브라우저에선 사용 안 함.
 * 설계(전송 방식 = 서명URL 직접 업로드): **바이트가 브릿지를 거치지 않는다.**
 *
 *   requestNativeCapture(source)                                   // MediaPicker가 호출
 *     → MEDIA_PICK_REQUEST(웹→네이티브)
 *   ← MEDIA_PICKED(네이티브→웹)  : 메타만(파일명/mime/용량/길이/이미지여부)
 *     → 웹이 한도 재검증 → /api/media/sign-upload(서명URL) → MEDIA_UPLOAD_TICKET(웹→네이티브)
 *   ← MEDIA_UPLOAD_DONE(네이티브→웹) : 네이티브가 로컬 파일을 서명URL로 직접 PUT 완료
 *     → requestNativeCapture가 native-upload MediaDraft로 resolve(저장 시 행만 생성)
 *   ← MEDIA_UPLOAD_ERROR / MEDIA_PICK_CANCELED → reject
 *
 * 메시지 수신은 컴포넌트(WebViewMediaBridge)가 window/document 'message' 리스너로 받아
 * handleNativeMessage(msg)로 흘려보낸다. requestId로 동시 캡처를 독립 추적한다.
 *
 * SSoT: docs/mma/Develop.md §5 / packages/webview-protocol
 */
import type { MediaMessage, MediaSource } from '@the-others/webview-protocol';

import {
  ALLOWED_IMAGE_MIME,
  ALLOWED_UPLOAD_MIME,
  IMAGE_MAX_BYTES,
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_DURATION_SEC,
  type MediaDraft,
} from './media-draft';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

/** native-upload 초안(캡처 성공 결과) — MediaDraft 유니온에서 좁힌 타입. */
export type NativeUploadDraft = Extract<MediaDraft, { kind: 'native-upload' }>;

/** 캡처 실패/취소 사유 — canceled면 사용자가 picker를 닫은 것(조용히 무시). */
export interface NativeCaptureRejection {
  canceled: boolean;
  message?: string;
}

interface PendingCapture {
  resolve: (draft: NativeUploadDraft) => void;
  reject: (reason: NativeCaptureRejection) => void;
  timer: ReturnType<typeof setTimeout>;
  // MEDIA_PICKED ~ MEDIA_UPLOAD_DONE 사이 보관하는 메타.
  fileName: string;
  mime: string;
  sizeBytes: number;
  durationSec: number | null;
  isImage: boolean;
  /** 네이티브 프리뷰 썸네일(JPEG base64). picker 프리뷰 + (영상) poster 업로드용. */
  previewBase64?: string;
  /** sign-upload가 돌려준 storage path — DONE 수신 시 행 생성에 사용. */
  storagePath?: string;
}

/**
 * 캡처+업로드 전체 타임아웃(ms) — 촬영 + sign-upload + 네이티브 PUT(오프라인 재시도 포함)까지.
 * ⚠ 네이티브 재시도 예산(upload-queue TICKET_BUDGET_MS=4분)보다 **길어야** 한다 — 안 그러면 웹이 먼저
 * reject한 뒤 네이티브가 늦게 DONE을 보내 고아 업로드가 된다. 6분 = 4분 예산 + 픽/서명 여유 2분.
 */
const CAPTURE_TIMEOUT_MS = 6 * 60 * 1000;

/** 진행 중 캡처 레지스트리(requestId → pending). 모듈 스코프 = 메시지 페어 간 상태 유지. */
const pending = new Map<string, PendingCapture>();

/** WebView(네이티브 앱) 안에서 실행 중인가 — 캡처 버튼 노출 게이트. */
export function isNativeBridgeAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.ReactNativeWebView;
}

function postToNative(message: MediaMessage): void {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}

/** 요청 상관 ID — 보안 컨텍스트의 crypto.randomUUID 우선, 부재 시 폴백(테스트/구형 환경). */
function newRequestId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `req-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

function cleanup(requestId: string): PendingCapture | undefined {
  const entry = pending.get(requestId);
  if (entry) {
    clearTimeout(entry.timer);
    pending.delete(requestId);
  }
  return entry;
}

/**
 * 네이티브 촬영/갤러리 요청 → 업로드 완료된 native-upload 초안으로 resolve.
 * 취소/실패는 NativeCaptureRejection으로 reject(canceled=true면 조용히 무시).
 *
 * mediaTypes: 카메라는 Android 시스템 카메라가 사진/영상 동시 모드를 못 띄우므로 — 둘 다 넘기면
 * expo가 사진 모드로 열어 영상 녹화가 불가능했다 — 호출부(MediaPicker)가 버튼별로 하나만 지정한다.
 * 갤러리는 기본(둘 다)이 맞다.
 */
export function requestNativeCapture(
  source: MediaSource,
  mediaTypes: ('image' | 'video')[] = ['image', 'video'],
): Promise<NativeUploadDraft> {
  if (!isNativeBridgeAvailable()) {
    return Promise.reject({ canceled: false, message: '네이티브 앱에서만 사용할 수 있습니다.' });
  }
  const requestId = newRequestId();
  return new Promise<NativeUploadDraft>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup(requestId);
      reject({ canceled: false, message: '시간이 초과되었습니다. 다시 시도해 주세요.' });
    }, CAPTURE_TIMEOUT_MS);
    // 메타 필드는 MEDIA_PICKED에서 채워진다(초기값은 placeholder).
    pending.set(requestId, {
      resolve,
      reject,
      timer,
      fileName: '',
      mime: '',
      sizeBytes: 0,
      durationSec: null,
      isImage: false,
    });
    postToNative({
      mode: 'MEDIA_PICK_REQUEST',
      data: {
        source,
        requestId,
        mediaTypes,
        // maxBytes는 코스(영상 상한)만 힌트로 — 정밀 per-type 검증은 웹이 MEDIA_PICKED에서 수행.
        limits: { maxBytes: UPLOAD_MAX_BYTES, maxDurationSec: UPLOAD_MAX_DURATION_SEC },
      },
    });
  });
}

/** MEDIA_PICKED 메타를 mime/용량/길이 한도와 대조(웹측 정밀 검증). 통과 시 null, 실패 시 안내. */
function validatePicked(d: Extract<MediaMessage, { mode: 'MEDIA_PICKED' }>['data']): string | null {
  const allowed = d.isImage ? ALLOWED_IMAGE_MIME : ALLOWED_UPLOAD_MIME;
  if (!(allowed as readonly string[]).includes(d.mime)) {
    return d.isImage ? 'jpg·png·webp 사진만 첨부할 수 있습니다.' : 'mp4·mov 영상만 첨부할 수 있습니다.';
  }
  const maxBytes = d.isImage ? IMAGE_MAX_BYTES : UPLOAD_MAX_BYTES;
  if (d.sizeBytes > maxBytes) {
    return `용량 초과(≤${Math.round(maxBytes / 1048576)}MB).`;
  }
  if (!d.isImage && d.durationSec != null && d.durationSec > UPLOAD_MAX_DURATION_SEC) {
    return `영상 길이 초과(≤${UPLOAD_MAX_DURATION_SEC}초).`;
  }
  return null;
}

async function onPicked(d: Extract<MediaMessage, { mode: 'MEDIA_PICKED' }>['data']): Promise<void> {
  const entry = pending.get(d.requestId);
  if (!entry) return; // stale/취소된 요청

  entry.fileName = d.fileName;
  entry.mime = d.mime;
  entry.sizeBytes = d.sizeBytes;
  entry.durationSec = d.durationSec;
  entry.isImage = d.isImage;
  entry.previewBase64 = d.previewBase64;

  const invalid = validatePicked(d);
  if (invalid) {
    cleanup(d.requestId);
    entry.reject({ canceled: false, message: invalid });
    return;
  }

  // 서명 업로드 URL 발급(서버가 한도/형식 재확인). 실패 시 reject — 네이티브 pending은 자체 타임아웃으로 정리.
  try {
    const res = await fetch('/api/media/sign-upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: d.fileName,
        size: d.sizeBytes,
        mime: d.mime,
        duration: d.isImage ? undefined : d.durationSec,
        kind: d.isImage ? 'image' : 'video',
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      cleanup(d.requestId);
      entry.reject({ canceled: false, message: body?.error ?? '업로드 URL 발급에 실패했습니다.' });
      return;
    }
    const { path, signedUrl } = (await res.json()) as { path: string; signedUrl: string };
    // 레이스 가드: fetch 대기 중 타임아웃이 발동해 이미 정리됐다면 티켓을 보내지 않는다.
    // (안 그러면 네이티브가 업로드는 하지만 DONE 수신 시 entry가 없어 행이 안 생겨 고아 파일이 됨.)
    if (!pending.has(d.requestId)) return;
    entry.storagePath = path;
    // ⚠ 업로드 윈도우 재시작 — 여기까지의 픽 소요는 타임아웃에 포함하지 않는다(픽은 사용자 주도라 길 수 있음).
    // 티켓 핸드오프 시점부터 CAPTURE_TIMEOUT_MS를 새로 재서, 네이티브 재시도 예산(4분)보다 항상 길게 보장
    // → 픽이 오래 걸려도 "웹이 먼저 타임아웃 후 네이티브가 늦게 DONE" 고아 레이스가 안 생긴다.
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      cleanup(d.requestId);
      entry.reject({ canceled: false, message: '업로드 시간이 초과되었습니다. 다시 시도해 주세요.' });
    }, CAPTURE_TIMEOUT_MS);
    // 네이티브가 로컬 파일을 이 절대 URL로 직접 PUT(content-type=mime). 토큰은 URL 쿼리에 포함됨.
    // 보안: signedUrl은 단명·PUT 전용·(user_id, path) 한정 토큰이지만, 네이티브측 로깅/크래시리포트가
    // postMessage 페이로드를 절대 캡처하지 않도록 해야 한다(Sentry 등 도입 시 필터링 필수). followup 참고.
    postToNative({ mode: 'MEDIA_UPLOAD_TICKET', data: { requestId: d.requestId, uploadUrl: signedUrl, mime: d.mime } });
  } catch {
    cleanup(d.requestId);
    // 오프라인이면 fetch가 즉시 던진다 — 일반 오류와 구분해 원인을 정확히 안내한다.
    // (서명URL 발급 전 단계라 upload-queue 재시도 대상이 아님 — 티켓 단계 큐잉은 오프라인-first 트랙.)
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    entry.reject({
      canceled: false,
      message: offline
        ? '오프라인 상태라 업로드할 수 없습니다. 네트워크 연결 후 다시 시도해 주세요.'
        : '업로드 준비 중 오류가 발생했습니다.',
    });
  }
}

function onUploadDone(requestId: string): void {
  const entry = cleanup(requestId);
  if (!entry) return;
  if (!entry.storagePath) {
    entry.reject({ canceled: false, message: '업로드 결과를 확인하지 못했습니다.' });
    return;
  }
  entry.resolve({
    kind: 'native-upload',
    storagePath: entry.storagePath,
    mime: entry.mime,
    sizeBytes: entry.sizeBytes,
    durationSec: entry.durationSec,
    isImage: entry.isImage,
    fileName: entry.fileName,
    previewBase64: entry.previewBase64 ?? null,
  });
}

/**
 * 컴포넌트(WebViewMediaBridge)가 수신한 MediaMessage를 분기 처리한다.
 * 웹→네이티브 메시지(REQUEST/TICKET)는 무시(우리가 보낸 것). 네이티브→웹만 의미 있음.
 */
export function handleNativeMessage(msg: MediaMessage): void {
  switch (msg.mode) {
    case 'MEDIA_PICKED':
      void onPicked(msg.data);
      return;
    case 'MEDIA_UPLOAD_DONE':
      onUploadDone(msg.data.requestId);
      return;
    case 'MEDIA_UPLOAD_ERROR': {
      const entry = cleanup(msg.data.requestId);
      entry?.reject({ canceled: false, message: msg.data.message || '업로드에 실패했습니다.' });
      return;
    }
    case 'MEDIA_PICK_CANCELED': {
      const entry = cleanup(msg.data.requestId);
      entry?.reject({ canceled: true });
      return;
    }
    // MEDIA_PICK_REQUEST / MEDIA_UPLOAD_TICKET = 웹이 보낸 메시지 → 수신측에서 무시.
    default:
      return;
  }
}

/** 테스트 전용 — 진행 중 캡처 레지스트리 초기화. */
export function __resetNativeBridgeForTest(): void {
  for (const [, entry] of pending) clearTimeout(entry.timer);
  pending.clear();
}
