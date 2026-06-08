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

/**
 * 훈련 리마인더 도메인 메시지 (웹 → 네이티브, 로컬 알림 MVP / 0023_reminder.sql).
 *
 * 방향: 웹앱(WebView)이 자기 리마인더 설정(profiles.reminder_*)을 **네이티브로 단방향 push**한다.
 *   · 로그인 후 프로필 로드 시(현재 상태 동기화) + 설정 저장 시(변경 반영) 두 시점에 보낸다.
 * 네이티브(apps/mobile)는 이 값을 받아 expo-notifications로 요일/시간 반복 **로컬 알림**을 스케줄한다
 *   (서버 푸시 아님 — 토큰/발송 인프라 불필요, 디바이스가 직접 스케줄).
 *
 * 페이로드:
 *   enabled — 리마인더 on/off. false면 네이티브는 기존 스케줄을 모두 취소만 한다.
 *   days    — 알림 요일(0=일 ~ 6=토, JS getDay()/dayjs day() 컨벤션). 비면 알림 없음.
 *             ⚠ expo-notifications weekday는 1=일 ~ 7=토라 네이티브가 +1 변환한다(여기선 0~6 유지).
 *   time    — 'HH:MM'(24h, 디바이스 로컬 시간). 네이티브가 hour/minute로 파싱.
 *
 * auth/media와 달리 요청-응답이 없는 fire-and-forget이다(네이티브 스케줄 결과를 웹은 추적하지 않음).
 */
export type ReminderMessage = {
  mode: 'REMINDER_SCHEDULE';
  data: { enabled: boolean; days: number[]; time: string };
};

/** ReminderMessage.mode 전체 집합 — 런타임 라우팅(네이티브 핸들러 등록)용. */
export const REMINDER_MESSAGE_MODES = ['REMINDER_SCHEDULE'] as const;
