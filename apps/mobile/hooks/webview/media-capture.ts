import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { MediaMessage, WebviewMessageType } from '@the-others/webview-protocol';

import { enqueueUpload } from './upload-queue';

/**
 * media-capture — 네이티브 촬영/갤러리 + 서명URL 직접 업로드 구현 (E 트랙 / Develop §5).
 *
 * webview-screen이 ctx.media 슬롯에 이 함수들을 꽂는다(핸들러는 검증만, 실 구현은 여기).
 * 흐름: handlePickRequest(촬영/선택 → MEDIA_PICKED) → [웹이 서명URL 발급] →
 *       handleUploadTicket(로컬 파일을 서명URL로 PUT → MEDIA_UPLOAD_DONE/ERROR).
 *
 * **바이트가 WebView 브릿지를 거치지 않는다** — expo-file-system이 로컬 파일을 직접 PUT(스트리밍).
 * MEDIA_PICKED ~ MEDIA_UPLOAD_TICKET 사이 로컬 파일 URI를 requestId별로 보관한다(모듈 스코프).
 */

type SendToWebview = (msg: WebviewMessageType) => void;

type PickRequest = Extract<MediaMessage, { mode: 'MEDIA_PICK_REQUEST' }>['data'];
type UploadTicket = Extract<MediaMessage, { mode: 'MEDIA_UPLOAD_TICKET' }>['data'];

interface PendingPick {
  fileUri: string;
  mime: string;
  /** 티켓 미도착 시 누수 방지용 만료 타이머(웹 5분 타임아웃과 대칭, 여유 두고 10분). */
  expiry: ReturnType<typeof setTimeout>;
}

/** requestId → 선택된 로컬 파일(티켓 도착 시 PUT). 핸들러가 매 렌더 재생성돼도 살아남도록 모듈 스코프. */
const pendingPicks = new Map<string, PendingPick>();

/** 보관 항목 TTL — 웹이 sign-upload 실패 등으로 티켓을 영영 안 보내도 메모리가 무한정 쌓이지 않게. */
const PICK_TTL_MS = 10 * 60 * 1000;

function deletePending(requestId: string): PendingPick | undefined {
  const entry = pendingPicks.get(requestId);
  if (entry) {
    clearTimeout(entry.expiry);
    pendingPicks.delete(requestId);
  }
  return entry;
}

function setPending(requestId: string, fileUri: string, mime: string): void {
  deletePending(requestId);
  const expiry = setTimeout(() => {
    pendingPicks.delete(requestId);
  }, PICK_TTL_MS);
  pendingPicks.set(requestId, { fileUri, mime, expiry });
}

/** mime → 확장자(파일명 생성용; 실제 storage 경로는 웹 sign-upload가 uuid로 강제). */
function extFor(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'video/quicktime':
      return 'mov';
    case 'video/mp4':
      return 'mp4';
    default:
      return mime.startsWith('image/') ? 'jpg' : 'mp4';
  }
}

/** 이미지 긴 변 상한 — 초과 시 리사이즈(용량 절감, 비율 보존). 사진은 보통 이걸로 충분. */
const MAX_IMAGE_DIMENSION = 2048;

/**
 * 픽한 이미지를 무조건 JPEG로 정규화 — 소스가 HEIC(iPhone 기본)·PNG 등 무엇이든 jpeg로 통일한다.
 * 웹 <img>가 못 그리는 HEIC 문제를 원천 차단(웹 sign-upload도 jpg/png/webp만 허용)하고, 큰 사진은
 * 긴 변 2048px로 리사이즈해 업로드 용량을 줄인다. 실패 시 원본 uri 반환(드물게 비-jpeg일 수 있음).
 */
async function normalizeImageToJpeg(uri: string, width?: number): Promise<string> {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    if (typeof width === 'number' && width > MAX_IMAGE_DIMENSION) {
      ctx.resize({ width: MAX_IMAGE_DIMENSION });
    }
    const ref = await ctx.renderAsync();
    const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
    return out.uri;
  } catch {
    return uri;
  }
}

/** asset.mimeType 부재 시(특히 iOS .mov) 파일명 확장자로 mime 추론. */
function mimeFromFileName(fileName: string | null | undefined, isImage: boolean): string {
  const ext = fileName?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'mov':
      return 'video/quicktime';
    case 'mp4':
    case 'm4v':
      return 'video/mp4';
    default:
      return isImage ? 'image/jpeg' : 'video/mp4';
  }
}

function send(sendToWebview: SendToWebview, msg: MediaMessage): void {
  sendToWebview(msg);
}

/** 웹의 MEDIA_PICK_REQUEST 처리 — 권한 → 촬영/선택 → 메타를 MEDIA_PICKED로 회신. */
export async function handlePickRequest(req: PickRequest, sendToWebview: SendToWebview): Promise<void> {
  const { requestId, source } = req;
  try {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      send(sendToWebview, {
        mode: 'MEDIA_UPLOAD_ERROR',
        data: { requestId, message: '카메라/사진 접근 권한이 필요합니다.' },
      });
      return;
    }

    // 웹이 요청한 mediaTypes를 존중('image'→'images', 'video'→'videos'). 비면 둘 다 허용.
    const mediaTypes: ImagePicker.MediaType[] = req.mediaTypes.map((t) =>
      t === 'image' ? 'images' : 'videos',
    );
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: mediaTypes.length > 0 ? mediaTypes : ['images', 'videos'],
      quality: 0.8,
      videoMaxDuration: req.limits.maxDurationSec,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets || result.assets.length === 0) {
      send(sendToWebview, { mode: 'MEDIA_PICK_CANCELED', data: { requestId } });
      return;
    }

    const asset = result.assets[0];
    const isImage = asset.type === 'image';

    let fileUri = asset.uri;
    let mime: string;
    let fileName: string;
    let durationSec: number | null;

    if (isImage) {
      // HEIC 등 어떤 소스든 JPEG로 정규화(웹 렌더/업로드 호환 보장).
      fileUri = await normalizeImageToJpeg(asset.uri, asset.width);
      mime = 'image/jpeg';
      fileName = 'photo.jpg';
      durationSec = null;
    } else {
      mime = asset.mimeType ?? mimeFromFileName(asset.fileName, false);
      fileName = asset.fileName ?? `capture.${extFor(mime)}`;
      // 영상 길이: picker는 ms로 준다 → 정수 초(웹 schema가 int 요구). 미상 → null.
      durationSec = asset.duration != null ? Math.max(1, Math.round(asset.duration / 1000)) : null;
    }

    // 용량: 영상은 picker 값 우선, 이미지는 정규화된 파일을 파일시스템에서 실측(원본 크기 아님).
    let sizeBytes = !isImage && asset.fileSize ? asset.fileSize : 0;
    if (!sizeBytes) {
      try {
        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists && typeof info.size === 'number') sizeBytes = info.size;
      } catch {
        // 조회 실패 → 0 유지(웹/서버 검증이 거른다)
      }
    }

    setPending(requestId, fileUri, mime);
    send(sendToWebview, {
      mode: 'MEDIA_PICKED',
      data: { requestId, fileName, mime, sizeBytes, durationSec, isImage },
    });
  } catch {
    deletePending(requestId);
    send(sendToWebview, {
      mode: 'MEDIA_UPLOAD_ERROR',
      data: { requestId, message: '미디어 선택 중 오류가 발생했습니다.' },
    });
  }
}

/**
 * 웹의 MEDIA_UPLOAD_TICKET 처리 — 보관 중인 로컬 파일을 upload-queue에 넘긴다.
 * 큐가 서명URL 직접 PUT + 오프라인 재시도 + DONE/ERROR 회신을 책임진다(E 트랙 #2).
 */
export async function handleUploadTicket(ticket: UploadTicket, sendToWebview: SendToWebview): Promise<void> {
  const { requestId, uploadUrl, mime } = ticket;
  const pick = pendingPicks.get(requestId);
  if (!pick) {
    send(sendToWebview, {
      mode: 'MEDIA_UPLOAD_ERROR',
      data: { requestId, message: '업로드할 파일을 찾지 못했습니다.' },
    });
    return;
  }
  // 픽 보관 해제(파일 경로는 큐로 이관 — 큐가 영속 복사/정리를 책임진다).
  deletePending(requestId);
  await enqueueUpload(requestId, uploadUrl, mime || pick.mime, pick.fileUri, sendToWebview);
}
