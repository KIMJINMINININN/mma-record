import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// MMA: 웹앱을 띄우는 WebView(web 탭)가 앱의 기본/유일 surface다 (Develop §9.1).
// 데모 탭(index/explore)은 제거됨. 네이티브 탭이 필요해지면(F5 촬영 등) 여기서 재구성.
export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="web"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="web"
        options={{
          title: 'MMA',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="globe" color={color} />,
        }}
      />
    </Tabs>
  );
}
