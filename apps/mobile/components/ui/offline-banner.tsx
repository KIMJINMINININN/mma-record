import { View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNetworkStatus } from '@/hooks/use-network-status'

export function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetworkStatus()
  const insets = useSafeAreaInsets()
  const offline = isConnected === false || isInternetReachable === false
  if (!offline) return null
  return (
    <View style={[styles.banner, { paddingTop: insets.top + 8 }]} pointerEvents="none">
      <Text style={styles.text}>인터넷 연결이 끊어졌습니다.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#B71C1C',
    paddingBottom: 8,
    paddingHorizontal: 12,
    zIndex: 1000,
    elevation: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
})
