/**
 * MediaDraft — 영속화 이전(클라이언트) 미디어 초안 모델 (F5 / Develop §5.3).
 *
 * picker가 수집하는 "초안"이다. youtube는 정규화된 videoId만, upload는 선택 파일 + object-URL 프리뷰
 * + 동기 검증된 메타를, external은 안전화된 http(s) URL을 담는다(F5).
 * 저장(persistMediaDrafts)에서 upload는 sign-upload→PUT(+첫프레임 썸네일), external은 메타행만 만든다.
 *
 * SSoT: docs/mma/Develop.md §5.3 / §5.6
 */
export type MediaDraft =
  | { kind: 'youtube'; videoId: string }
  | { kind: 'external'; url: string; title: string | null }
  | {
      kind: 'upload';
      file: File;
      previewUrl: string;
      sizeBytes: number;
      durationSec: number | null;
      mime: string;
    }
  /**
   * 네이티브(Expo) 촬영/갤러리 — WebView 브릿지를 통해 네이티브가 **이미 서명URL로
   * 업로드를 끝낸** 자산. 브라우저엔 File이 없고 storage path만 있다(바이트가 브릿지를 안 거침).
   * persistMediaDrafts는 이 kind를 sign-upload/PUT 없이 행 생성만 한다.
   */
  | {
      kind: 'native-upload';
      storagePath: string;
      mime: string;
      sizeBytes: number;
      durationSec: number | null;
      /** 이미지면 true(영상이면 false) — picker 그리드 라벨/표시 분기용. */
      isImage: boolean;
      fileName: string;
    };

/** 업로드 한도 — env로 노출(클라이언트 사전검증). 기본 100MiB / 60초 / mp4·mov (Develop §5.3). */
export const UPLOAD_MAX_BYTES = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_BYTES ?? 104857600); // 100MiB
export const UPLOAD_MAX_DURATION_SEC = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_DURATION_SEC ?? 60);
export const ALLOWED_UPLOAD_MIME = ['video/mp4', 'video/quicktime'] as const;

/**
 * 이미지 업로드 — 네이티브 촬영/갤러리(E 트랙)로만 들어오는 경로(브라우저 파일 입력은 영상 전용 유지).
 * 사진은 보통 수 MB라 영상과 별도의 넉넉한 상한(기본 20MiB). 웹 렌더 가능한 형식만 허용(HEIC 제외 — 후속).
 */
export const IMAGE_MAX_BYTES = Number(process.env.NEXT_PUBLIC_IMAGE_MAX_BYTES ?? 20971520); // 20MiB
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** mime이 허용 이미지 형식인가. (native-upload 분기·sign-upload 'image' 경로와 일치) */
export function isImageMime(mime: string): boolean {
  return (ALLOWED_IMAGE_MIME as readonly string[]).includes(mime);
}

/** mime이 허용 영상 형식인가. */
export function isUploadVideoMime(mime: string): boolean {
  return (ALLOWED_UPLOAD_MIME as readonly string[]).includes(mime);
}

/** 한도 초과 안내 — §9.2 인라인 정보(숫자는 상수에서 계산). */
const OVER_LIMIT_MESSAGE = `${UPLOAD_MAX_DURATION_SEC}초·${Math.round(
  UPLOAD_MAX_BYTES / 1048576,
)}MB 초과. 유튜브(비공개/미등록)로 추가하세요.`;

/** 업로드 검증 실패 사유 + 사용자용 한글 메시지. */
export interface UploadValidationError {
  reason: 'mime' | 'size' | 'duration';
  message: string;
}

/**
 * 파일 MIME/용량 검증(동기). duration은 <video> 메타 로드 후 별도(validateDuration)로 확인한다.
 * 통과 시 null, 실패 시 사유+메시지. (Develop §5.3 — 클라이언트 1차 방어, 서버가 재확인)
 */
export function validateUploadFileSync(file: File): UploadValidationError | null {
  if (!(ALLOWED_UPLOAD_MIME as readonly string[]).includes(file.type)) {
    return { reason: 'mime', message: 'mp4 또는 mov 영상만 업로드할 수 있습니다.' };
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    return { reason: 'size', message: OVER_LIMIT_MESSAGE };
  }
  return null;
}

/**
 * 영상 길이 검증 — <video> 메타데이터에서 얻은 duration(초)을 한도와 비교한다.
 * 통과 시 null, 초과 시 §9.2 한도 초과 안내(유튜브 경로 유도).
 */
export function validateDuration(durationSec: number): UploadValidationError | null {
  if (durationSec > UPLOAD_MAX_DURATION_SEC) {
    return { reason: 'duration', message: OVER_LIMIT_MESSAGE };
  }
  return null;
}
