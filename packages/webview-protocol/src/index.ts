// WebView <-> Native 메시지 프로토콜
// 웹(Next.js)과 앱(Expo) 양쪽이 동일한 타입 정의를 공유하도록 추출됨.

/** 기본 메시지 봉투 — 모든 WebView ↔ Native 메시지가 따르는 형식. */
export type WebviewMessageType = {
  mode: string;
  data?: any;
};

/** 인증 도메인 메시지 (discriminated union by `mode`). */
export type AuthMessage =
  | { mode: 'AUTH_LOGIN'; data: { provider: string; credential: string } }
  | { mode: 'AUTH_LOGOUT'; data?: undefined }
  | { mode: 'AUTH_TOKEN_REFRESH'; data: { refreshToken: string } };

/** 캡처 진입점 — 카메라 촬영 / 갤러리(라이브러리) 선택. */
export type MediaSource = 'camera' | 'library';

/**
 * 미디어 캡처 도메인 메시지 (네이티브 촬영/갤러리 → 서명URL 직접 업로드, E 트랙 / Develop §5).
 *
 * 핵심 설계: **바이트가 WebView 브릿지를 거치지 않는다.** 네이티브가 로컬 파일을
 * 웹에서 발급한 서명 업로드 URL로 직접 PUT하므로, 큰 영상(≤100MB)도 base64 직렬화 없이 안전하다.
 *
 * 요청-응답 흐름(`requestId`로 상관관계 추적):
 *   웹 → 네이티브  MEDIA_PICK_REQUEST   { requestId, source, mediaTypes, limits }
 *   네이티브 → 웹  MEDIA_PICKED        { requestId, fileName, mime, sizeBytes, durationSec, isImage }
 *   네이티브 → 웹  MEDIA_PICK_CANCELED { requestId }                 // 사용자가 picker 취소
 *   웹 → 네이티브  MEDIA_UPLOAD_TICKET { requestId, uploadUrl, mime } // 웹이 sign-upload로 발급
 *   네이티브 → 웹  MEDIA_UPLOAD_DONE   { requestId }                 // 네이티브 PUT 성공
 *   네이티브 → 웹  MEDIA_UPLOAD_ERROR  { requestId, message }        // 권한/네트워크/PUT 실패
 *
 * 웹은 sign-upload가 돌려준 storage `path`를 requestId별로 보관하다가 DONE 수신 시
 * media_assets 행(kind='upload')을 만든다 — 네이티브는 path를 알 필요가 없다(uploadUrl만 PUT).
 */
export type MediaMessage =
  | {
      mode: 'MEDIA_PICK_REQUEST';
      data: {
        requestId: string;
        source: MediaSource;
        mediaTypes: ('image' | 'video')[];
        limits: { maxBytes: number; maxDurationSec: number };
      };
    }
  | {
      mode: 'MEDIA_PICKED';
      data: {
        requestId: string;
        fileName: string;
        mime: string;
        sizeBytes: number;
        /** 영상 길이(정수 초). 이미지/길이 미상 → null. */
        durationSec: number | null;
        isImage: boolean;
        /**
         * 작은 프리뷰 썸네일(JPEG base64, ~240px). 이미지=축소본, 영상=첫프레임.
         * 용도: 웹 picker 즉시 프리뷰 + (영상) thumbs/ 업로드해 poster. 작아서 브릿지 부담 미미(수~십 KB).
         */
        previewBase64?: string;
      };
    }
  | { mode: 'MEDIA_PICK_CANCELED'; data: { requestId: string } }
  | { mode: 'MEDIA_UPLOAD_TICKET'; data: { requestId: string; uploadUrl: string; mime: string } }
  | { mode: 'MEDIA_UPLOAD_DONE'; data: { requestId: string } }
  | { mode: 'MEDIA_UPLOAD_ERROR'; data: { requestId: string; message: string } };

/** MediaMessage.mode 전체 집합 — 런타임 라우팅(웹 수신 리스너 / 네이티브 핸들러)용. */
export const MEDIA_MESSAGE_MODES = [
  'MEDIA_PICK_REQUEST',
  'MEDIA_PICKED',
  'MEDIA_PICK_CANCELED',
  'MEDIA_UPLOAD_TICKET',
  'MEDIA_UPLOAD_DONE',
  'MEDIA_UPLOAD_ERROR',
] as const;
