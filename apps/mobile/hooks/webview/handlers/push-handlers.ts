import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { MessageHandler, HandlerContext } from '../types';
import type { PushTokenMessage } from '@the-others/webview-protocol';

// 서버 푸시 토큰 등록(웹 → 네이티브 → 웹) — 서버 푸시 / 0026_push.sql.
//
// 방향(요청-응답): MMA 웹앱(WebView, 인증됨)이 토큰을 요청하면, 네이티브가 토큰을 얻어 회신한다.
//   · 토큰 요청  ← PUSH_TOKEN_REQUEST                          (웹이 (app) 마운트 시 송신)
//   · 토큰 회신  → PUSH_TOKEN_REGISTER { token, platform }      (웹이 register_push_token RPC로 upsert)
// 웹은 회신받은 ExpoPushToken을 register_push_token RPC로 push_tokens에 저장 → 코멘트 트리거가 이 토큰으로 푸시.
//
// reminder-handlers와 동일하게 ctx 슬롯 위임이 아니라 **여기서 직접** 토큰을 획득한다(권한+토큰은 본 기능의 산출물).
// PushTokenMessage 형태에만 타입 세이프하게 유지. 탭→네비게이션(응답 리스너)은 후속(스코프 밖).
//
// 휴면 규약 — 다음 중 하나라도 없으면 조용히 스킵(웹에 회신 없음 = register 안 함):
//   1) EAS projectId — Constants.expoConfig.extra.eas.projectId. 없으면(시뮬레이터/Expo Go/EAS 빌드 전) 스킵.
//   2) 알림 권한 — requestPermissionsAsync()가 거부면 스킵.
//   3) getExpoPushTokenAsync — 자격(FCM/APNs) 없는 환경에선 throw → try/catch로 스킵.
// EAS 빌드 + 푸시 자격 + 실기기 전까지는 항상 1~3에서 멈춰 휴면 상태가 된다.

export function createPushHandlers(ctx: HandlerContext): Record<string, MessageHandler> {
  return {
    PUSH_TOKEN_REQUEST: async () => {
      // 1) EAS projectId 가드 — 체인 전체를 옵셔널 체이닝으로(설정/필드 부재 모두 흡수).
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId as string | undefined;
      if (!projectId) {
        console.warn('[push-handlers] no EAS projectId — push token skipped (dormant until EAS build)');
        return;
      }

      // 2) 알림 권한 — 거부면 토큰 획득 불가(조용히 종료, 웹에 회신 없음).
      const perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted && perm.status !== 'granted') {
        console.warn('[push-handlers] notification permission not granted — push token skipped');
        return;
      }

      // 3) Expo 푸시 토큰 — 시뮬레이터/자격 미설정 환경에선 throw 하므로 try/catch로 휴면 처리.
      try {
        const tokenResp = await Notifications.getExpoPushTokenAsync({ projectId });
        // 웹으로 회신 — register_push_token RPC로 upsert 된다. PushTokenMessage 형태에 맞춰 송신.
        const message: Extract<PushTokenMessage, { mode: 'PUSH_TOKEN_REGISTER' }> = {
          mode: 'PUSH_TOKEN_REGISTER',
          data: { token: tokenResp.data, platform: Platform.OS },
        };
        ctx.sendToWebview(message);
      } catch (e) {
        console.warn('[push-handlers] getExpoPushTokenAsync failed — push token skipped (dormant):', e);
      }
    },
  };
}
