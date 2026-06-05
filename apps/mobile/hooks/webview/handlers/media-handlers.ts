import type { MessageHandler, HandlerContext } from '../types';
import type { MediaMessage } from '@the-others/webview-protocol';

// 미디어 캡처(웹 → 네이티브) — E 트랙 / Develop §5.
//
// 방향: MMA 웹앱(WebView)이 촬영/갤러리 버튼 → 다음 메시지를 네이티브에 보낸다.
//   · 촬영/선택 요청  → MEDIA_PICK_REQUEST { requestId, source, mediaTypes, limits }
//   · 업로드 티켓     → MEDIA_UPLOAD_TICKET { requestId, uploadUrl, mime }   (웹이 sign-upload로 발급)
// 네이티브는 picker(촬영/갤러리)를 띄우고, 선택 결과 메타를 MEDIA_PICKED로 회신한 뒤,
// 티켓을 받으면 로컬 파일을 서명URL로 직접 PUT하고 MEDIA_UPLOAD_DONE/ERROR로 회신한다.
//
// auth-handlers와 동일하게 **검증만** 하고 실 구현(expo-image-picker / expo-file-system)은
// ctx.media.* 슬롯에 위임한다(webview-screen이 media-capture를 꽂는다). MediaMessage 형태에
// 대해서만 타입 세이프하게 유지한다.

export function createMediaHandlers(ctx: HandlerContext): Record<string, MessageHandler> {
  return {
    MEDIA_PICK_REQUEST: async (data) => {
      const msg = data as Extract<MediaMessage, { mode: 'MEDIA_PICK_REQUEST' }>['data'];
      if (!msg?.requestId || !msg?.source) {
        console.warn('[media-handlers] MEDIA_PICK_REQUEST missing requestId/source');
        return;
      }
      await ctx.media?.onPickRequest?.(msg);
    },

    MEDIA_UPLOAD_TICKET: async (data) => {
      const msg = data as Extract<MediaMessage, { mode: 'MEDIA_UPLOAD_TICKET' }>['data'];
      if (!msg?.requestId || !msg?.uploadUrl || !msg?.mime) {
        console.warn('[media-handlers] MEDIA_UPLOAD_TICKET missing requestId/uploadUrl/mime');
        return;
      }
      await ctx.media?.onUploadTicket?.(msg);
    },
  };
}
