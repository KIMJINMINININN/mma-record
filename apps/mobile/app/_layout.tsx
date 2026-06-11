import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
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
