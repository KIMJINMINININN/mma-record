import { useEffect, useRef, useState } from 'react';
import WebView from 'react-native-webview';
import { BackHandler, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { WebviewMessageType } from '@the-others/webview-protocol';
import { ENV } from '@/config/env';

export interface UseWebviewProps {
  onBackPress: () => boolean;
}

export default function useWebview({ onBackPress }: UseWebviewProps) {
  const webviewRef = useRef<WebView>(null);
  const [webviewUrl, setWebviewUrl] = useState(ENV.CLIENT_URL);
  // 푸시 탭 dedup — 같은 응답이 getLastNotificationResponseAsync(콜드 스타트 회수)와
  // 리스너(웜/백그라운드) 양쪽으로 들어올 수 있어 request.identifier로 1회만 처리.
  const handledPushId = useRef<string | null>(null);

  useEffect(() => {
    // Android 백버튼 핸들링
    if (Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription.remove();
    }
  }, [onBackPress]);

  useEffect(() => {
    // 딥링크 처리
    const handleDeepLink = (event: { url: string }) => {
      if (event.url) {
        deepLink(event.url);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) deepLink(url);
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // 푸시 탭 → 해당 화면 이동 (0026/0033 트리거가 data.url로 웹 내부 경로를 보낸다:
    // '/share/<token>' · '/gym/feed/<id>'). 탭하면 WebView를 그 경로로 이동시킨다.
    //   · 웜/백그라운드 탭 = addNotificationResponseReceivedListener
    //   · 콜드 스타트 탭(앱 종료 상태) = 리스너 등록 전이라 getLastNotificationResponseAsync로 1회 회수
    // data.url 없는 알림(로컬 리마인더 등)은 이동 없이 평소처럼 열린다.
    const navigateFromResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handledPushId.current === id) return;
      handledPushId.current = id;

      const url = (response.notification.request.content.data as { url?: unknown } | undefined)
        ?.url;
      // 내부 경로만 허용 — 단일 '/'로 시작(스킴·'//host' 차단). 페이로드는 우리 트리거 산출물이지만 방어적으로.
      if (typeof url !== 'string' || !/^\/(?!\/)/.test(url)) return;
      // deepLink와 동일하게 t 파람으로 동일-URL 재탭에도 source 변경을 보장한다.
      // (URL 파서 대신 문자열 조립 — Hermes 폴리필 표면 회피, 경로는 위에서 검증됨)
      const sep = url.includes('?') ? '&' : '?';
      setWebviewUrl(`${ENV.CLIENT_URL}${url}${sep}t=${Date.now()}`);
    };

    Notifications.getLastNotificationResponseAsync().then(navigateFromResponse);
    const subscription = Notifications.addNotificationResponseReceivedListener(navigateFromResponse);
    return () => subscription.remove();
  }, []);

  function deepLink(url: string) {
    try {
      const [_, path] = url.split('://');
      const pathSegments = path.split('/');
      const sliceStart = url.startsWith('http') ? 1 : 0;
      const cleanPath = pathSegments.slice(sliceStart).join('/');

      const targetUrl = new URL(`${ENV.CLIENT_URL}/${cleanPath}`);
      targetUrl.searchParams.set('t', `${Date.now()}`);
      setWebviewUrl(targetUrl.toString());
    } catch (err) {
      console.log('[useWebview] Deep link error:', err);
      setWebviewUrl(ENV.CLIENT_URL);
    }
  }

  function sendToWebview(data: WebviewMessageType) {
    if (!webviewRef.current) return;
    webviewRef.current.postMessage(JSON.stringify(data));
  }

  function reloadWebview() {
    webviewRef.current?.reload();
  }

  return { webviewRef, webviewUrl, sendToWebview, reloadWebview };
}
