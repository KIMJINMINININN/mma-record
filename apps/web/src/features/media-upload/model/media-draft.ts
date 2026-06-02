/**
 * MediaDraft — 영속화 이전(클라이언트) 미디어 초안 모델 (F5 / Develop §5.3).
 *
 * 인프라 전 단계의 picker가 수집하는 "초안"이다. media_assets 행이 없으므로(인프라 후 생성)
 * 아직 logSession으로 흘러가지 않는다(media: [] 유지). youtube는 정규화된 videoId만,
 * upload는 선택 파일 + object-URL 프리뷰 + 동기 검증된 메타를 담는다.
 *
 * external 링크는 P1 — 지금은 youtube/upload 두 종류만 수집한다(Design §9.1).
 *
 * SSoT: docs/mma/Develop.md §5.3
 */
export type MediaDraft =
  | { kind: 'youtube'; videoId: string }
  | {
      kind: 'upload';
      file: File;
      previewUrl: string;
      sizeBytes: number;
      durationSec: number | null;
      mime: string;
    };

/** 업로드 한도 — env로 노출(클라이언트 사전검증). 기본 100MiB / 60초 / mp4·mov (Develop §5.3). */
export const UPLOAD_MAX_BYTES = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_BYTES ?? 104857600); // 100MiB
export const UPLOAD_MAX_DURATION_SEC = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_DURATION_SEC ?? 60);
export const ALLOWED_UPLOAD_MIME = ['video/mp4', 'video/quicktime'] as const;

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
