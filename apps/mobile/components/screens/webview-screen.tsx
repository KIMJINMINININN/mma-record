import React, { useCallback, useRef, useState } from 'react';
import { WebView, WebViewNavigation } from 'react-native-webview';
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebViewErrorEvent } from 'react-native-webview/lib/WebViewTypes';
import useWebview from '@/hooks/webview/use-webview';
import { useWebviewMessage } from '@/hooks/webview/use-webview-message';

export default function WebViewScreen() {
  const navState = useRef<WebViewNavigation | null>(null);
  const exitApp = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [networkErrorVisible, setNetworkErrorVisible] = useState(false);

  const handlePressBack = useCallback(() => {
    if (webviewRef.current && navState.current?.canGoBack) {
      webviewRef.current.goBack();
    } else {
      if (exitApp.current) {
        exitApp.current = false;
        if (timeout.current) clearTimeout(timeout.current);
        BackHandler.exitApp();
      } else {
        exitApp.current = true;
        ToastAndroid.show('한번 더 누르면 종료됩니다.', ToastAndroid.SHORT);
        timeout.current = setTimeout(() => {
          exitApp.current = false;
        }, 2000);
      }
    }
    return true;
  }, []);

  const { webviewRef, webviewUrl, sendToWebview, reloadWebview } = useWebview({
    onBackPress: handlePressBack,
  });

  const { onMessage } = useWebviewMessage({
    sendToWebview,
    webviewRef,
  });

  function handleWebviewError(e: WebViewErrorEvent) {
    if (e.nativeEvent.description === 'net::ERR_INTERNET_DISCONNECTED') {
      setNetworkErrorVisible(true);
    }
  }

  function setNavigation(e: WebViewNavigation) {
    navState.current = e;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webviewContainer}>
        <WebView
          ref={webviewRef}
          source={{ uri: webviewUrl }}
          onMessage={onMessage}
          javaScriptEnabled
          allowsBackForwardNavigationGestures
          onNavigationStateChange={setNavigation}
          onContentProcessDidTerminate={reloadWebview}
          onError={handleWebviewError}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          bounces={false}
        />
      </View>

      {/* 네트워크 에러 모달 */}
      <Modal visible={networkErrorVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              앗, 네트워크에 연결할 수 없어요
            </Text>
            <Text style={styles.modalSubtitle}>
              현재 네트워크 연결이 불안정합니다.{'\n'}잠시 후 다시 시도해
              주세요.
            </Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => {
                reloadWebview();
                setNetworkErrorVisible(false);
              }}>
              <Text style={styles.modalButtonText}>재시도</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webviewContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
