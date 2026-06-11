import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSecurityModule } from '@/hooks/use-security-module';
import { useVersionCheck } from '@/hooks/use-version-check';
import { OfflineBanner } from '@/components/ui/offline-banner';

// 포그라운드에서도 알림 배너를 띄운다(기본값은 포그라운드 미표시) — 코멘트 푸시(0026/0033)·리마인더(0023)가
// 앱 사용 중에도 보이고, 탭하면 use-webview의 response 리스너가 해당 화면(data.url)으로 이동시킨다.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Android 알림 채널 — 이름 있는 채널로 분리해 시스템 설정에서 종류별 on/off가 가능하게 한다.
//   · reminders: 로컬 훈련 리마인더(0023) — reminder-handlers가 channelId로 지정.
//   · comments : 코멘트·체육관 피드백 푸시용 예약 — ⚠ 서버(0026/0033) 페이로드에 channelId를 넣는 건
//     이 빌드가 충분히 보급된 뒤에만(채널 없는 구 APK에 channelId 푸시가 오면 Android가 드랍). 그 전까지
//     원격 푸시는 expo fallback 채널로 표시된다(동작 동일, 채널 이름만 미정리).
// 멱등(setNotificationChannelAsync는 upsert) + fire-and-forget(실패해도 fallback 채널로 동작).
if (Platform.OS === 'android') {
  void Notifications.setNotificationChannelAsync('reminders', {
    name: '훈련 리마인더',
    importance: Notifications.AndroidImportance.HIGH,
  });
  void Notifications.setNotificationChannelAsync('comments', {
    name: '코멘트·피드백',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { securityPassed, securityChecking } = useSecurityModule();
  useVersionCheck();

  // Security gate: render nothing while checking or if check failed.
  // The hook shows a blocking Alert and exits (Android) or loops the alert (iOS)
  // when securityPassed === false, so rendering null here is safe.
  if (securityChecking || !securityPassed) {
    return <SafeAreaProvider />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="webview" options={{ headerShown: false }} />
        </Stack>
        <OfflineBanner />
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
