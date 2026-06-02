import { useEffect, useRef, useState } from 'react';
import WebView from 'react-native-webview';
import { BackHandler, Linking, Platform } from 'react-native';
import type { WebviewMessageType } from '@the-others/webview-protocol';
import { ENV } from '@/config/env';

export interface UseWebviewProps {
  onBackPress: () => boolean;
}

export default function useWebview({ onBackPress }: UseWebviewProps) {
  const webviewRef = useRef<WebView>(null);
  const [webviewUrl, setWebviewUrl] = useState(ENV.CLIENT_URL);

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
