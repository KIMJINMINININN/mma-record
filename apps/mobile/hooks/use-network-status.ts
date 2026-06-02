import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

export type NetworkStatus = {
  isConnected: boolean
  isInternetReachable: boolean | null
  type: string
}

const DEFAULT_STATUS: NetworkStatus = {
  isConnected: true,
  isInternetReachable: null,
  type: 'unknown',
}

let latestStatus: NetworkStatus = { ...DEFAULT_STATUS }

export const getNetworkStatusSnapshot = (): NetworkStatus => latestStatus

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(latestStatus)

  useEffect(() => {
    // Fetch initial state
    NetInfo.fetch().then((state) => {
      const next: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      }
      latestStatus = next
      setStatus(next)
    })

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const next: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      }
      latestStatus = next
      setStatus(next)
    })

    return unsubscribe
  }, [])

  return status
}
