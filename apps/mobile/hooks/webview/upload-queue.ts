import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import type { WebviewMessageType } from '@the-others/webview-protocol';

/**
 * upload-queue — 세션 내 오프라인 재시도 업로드 큐 (E 트랙 #2 / Develop §5).
 *
 * 네이티브가 서명 URL로 로컬 파일을 PUT하다 네트워크로 실패하면 즉시 ERROR 대신 큐에 넣고,
 * 온라인 복귀(NetInfo) 또는 지수 backoff 타이머로 재시도한다. 캡처 파일은 영속 디렉토리로 복사해
 * OS 캐시 eviction에도 살아남게 한다. 성공 시 MEDIA_UPLOAD_DONE, 예산 소진/영구실패 시 MEDIA_UPLOAD_ERROR.
 *
 * ⚠ 교차 경계 불변식: 재시도 예산(TICKET_BUDGET_MS=4분)은 반드시 웹의 캡처 타임아웃
 * (native-bridge CAPTURE_TIMEOUT_MS=6분)보다 **짧아야** 한다. 안 그러면 웹이 먼저 타임아웃→reject한 뒤
 * 네이티브가 늦게 DONE을 보내 행이 안 만들어진 고아 업로드가 된다. 서명 URL TTL(10분)보다도 짧다.
 *
 * 범위(Fork A): "세션 내" 재시도만 — 앱 강제종료/WebView 리로드는 웹 오케스트레이션 상태가 사라지므로
 * 복구하지 않는다(고아 방지). 장기 오프라인 큐(cross-session)는 완전 오프라인-first(P2)에서 다룬다.
 */

type SendToWebview = (msg: WebviewMessageType) => void;

interface QueuedUpload {
  uploadUrl: string;
  mime: string;
  /** 업로드할 파일(영속 복사본 또는 원본). */
  fileUri: string;
  /** 완료 시 삭제할 복사본(복사 실패 시 null=원본 사용, 삭제 안 함). */
  cleanupUri: string | null;
  attempts: number;
  /** 이 시각(ms) 이후엔 포기 — 웹 타임아웃보다 짧게. */
  deadline: number;
  send: SendToWebview;
  timer: ReturnType<typeof setTimeout> | null;
  inFlight: boolean;
}

/** 재시도 예산 — 웹 native-bridge CAPTURE_TIMEOUT_MS(6분)보다 짧게(고아 방지) + 서명 URL TTL(10분) 이내. */
const TICKET_BUDGET_MS = 4 * 60 * 1000;
const BASE_BACKOFF_MS = 3000;
const MAX_BACKOFF_MS = 60000;

/** 진행 중 업로드(requestId → 큐 항목). 핸들러 재생성과 무관하게 살아남도록 모듈 스코프. */
const queue = new Map<string, QueuedUpload>();

let netInfoUnsub: (() => void) | null = null;

function ensureNetInfoSub(): void {
  if (netInfoUnsub) return;
  netInfoUnsub = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      // 온라인 복귀 → 대기 항목 즉시 재시도.
      for (const id of queue.keys()) attemptSoon(id, 0);
    }
  });
}

function maybeTeardownNetInfo(): void {
  if (queue.size === 0 && netInfoUnsub) {
    netInfoUnsub();
    netInfoUnsub = null;
  }
}

function backoffMs(attempts: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));
}

function cleanup(requestId: string, entry: QueuedUpload): void {
  if (entry.timer) clearTimeout(entry.timer);
  queue.delete(requestId);
  if (entry.cleanupUri) {
    FileSystem.deleteAsync(entry.cleanupUri, { idempotent: true }).catch(() => {});
  }
  maybeTeardownNetInfo();
}

function finishDone(requestId: string, entry: QueuedUpload): void {
  cleanup(requestId, entry);
  entry.send({ mode: 'MEDIA_UPLOAD_DONE', data: { requestId } });
}

function finishError(requestId: string, entry: QueuedUpload, message: string): void {
  cleanup(requestId, entry);
  entry.send({ mode: 'MEDIA_UPLOAD_ERROR', data: { requestId, message } });
}

/** delayMs 후 1회 시도 예약(중복/in-flight 방지). 보류 중 타이머는 inFlight 체크 전에 항상 정리(누수 방지). */
function attemptSoon(requestId: string, delayMs: number): void {
  const entry = queue.get(requestId);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer); // inFlight 여부와 무관하게 항상 먼저 정리
  if (entry.inFlight) return; // 진행 중이면 새 타이머는 안 건다(완료 시 scheduleRetry가 다시 예약)
  entry.timer = setTimeout(() => {
    void attempt(requestId);
  }, delayMs);
}

function scheduleRetry(requestId: string, entry: QueuedUpload): void {
  entry.attempts += 1;
  const wait = backoffMs(entry.attempts);
  if (Date.now() + wait > entry.deadline) {
    finishError(requestId, entry, '오프라인이 지속되어 업로드하지 못했습니다. 다시 시도해 주세요.');
    return;
  }
  attemptSoon(requestId, wait);
}

async function attempt(requestId: string): Promise<void> {
  const entry = queue.get(requestId);
  if (!entry || entry.inFlight) return;
  if (Date.now() > entry.deadline) {
    finishError(requestId, entry, '오프라인이 지속되어 업로드하지 못했습니다. 다시 시도해 주세요.');
    return;
  }
  entry.inFlight = true;
  try {
    const res = await FileSystem.uploadAsync(entry.uploadUrl, entry.fileUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { 'content-type': entry.mime, 'x-upsert': 'false' },
    });
    entry.inFlight = false;
    if (res.status >= 200 && res.status < 300) {
      finishDone(requestId, entry);
      return;
    }
    // 권한/토큰 만료(401/403)는 재시도해도 무의미 → 영구 실패(새 티켓 필요).
    if (res.status === 401 || res.status === 403) {
      finishError(requestId, entry, `업로드 권한이 만료되었습니다(${res.status}). 다시 시도해 주세요.`);
      return;
    }
    // 그 외 비-2xx(429/5xx 등)은 일시 오류로 보고 재시도.
    scheduleRetry(requestId, entry);
  } catch {
    // 네트워크 예외(오프라인 등) → 재시도(NetInfo 복귀 또는 backoff 타이머가 다시 부른다).
    entry.inFlight = false;
    scheduleRetry(requestId, entry);
  }
}

/**
 * 업로드를 큐에 넣고 즉시 1차 시도 — 실패 시 예산 내 재시도. 결과(DONE/ERROR)는 send로 회신.
 * fileUri는 영속 디렉토리로 복사해 재시도 윈도우 동안 OS eviction을 피한다(복사 실패 시 원본 사용).
 */
export async function enqueueUpload(
  requestId: string,
  uploadUrl: string,
  mime: string,
  fileUri: string,
  send: SendToWebview,
): Promise<void> {
  // 방어: 같은 requestId가 이미 큐에 있으면(중복 enqueue) 기존 항목 정리 — 복사본/타이머 고아 방지.
  const existing = queue.get(requestId);
  if (existing) {
    if (existing.timer) clearTimeout(existing.timer);
    if (existing.cleanupUri) {
      FileSystem.deleteAsync(existing.cleanupUri, { idempotent: true }).catch(() => {});
    }
    queue.delete(requestId);
  }

  let persistentUri = fileUri;
  let cleanupUri: string | null = null;
  const dir = FileSystem.documentDirectory;
  if (dir) {
    try {
      const ext = fileUri.split('.').pop()?.split('?')[0] || 'bin';
      // requestId(UUID) + nonce로 파일명 충돌 원천 차단(지연된 deleteAsync가 새 파일을 지우는 레이스 방지).
      const nonce = Date.now().toString(36) + Math.round(Math.random() * 1e6).toString(36);
      const dest = `${dir}matlog-upload-${requestId}-${nonce}.${ext}`;
      await FileSystem.copyAsync({ from: fileUri, to: dest });
      persistentUri = dest;
      cleanupUri = dest;
    } catch {
      // 복사 실패 → 원본 URI로 진행(짧은 재시도 윈도우면 보통 캐시가 살아있다).
    }
  }
  ensureNetInfoSub();
  queue.set(requestId, {
    uploadUrl,
    mime,
    fileUri: persistentUri,
    cleanupUri,
    attempts: 0,
    deadline: Date.now() + TICKET_BUDGET_MS,
    send,
    timer: null,
    inFlight: false,
  });
  await attempt(requestId);
}
