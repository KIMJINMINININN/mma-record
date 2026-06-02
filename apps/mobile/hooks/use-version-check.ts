/**
 * 앱 버전 업데이트 여부를 확인하고, 필요 시 Alert를 표시하는 훅.
 * 개발 환경에서는 검사를 건너뛰며, AppState 변경 시 강제 업데이트 Alert를 재노출한다.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Alert, Linking, Platform, AppState, AppStateStatus } from 'react-native'
import * as Application from 'expo-application'
import { fetchLatestVersion, VersionCheckResponse } from '@/services/api/endpoints/version'
import { ENV } from '@/config/env'

export type VersionCheckState = {
  checking: boolean
  latestVersion: string | null
  currentVersion: string | null
  updateRequired: boolean
  updateAvailable: boolean
  error: Error | null
}

const initialState: VersionCheckState = {
  checking: false,
  latestVersion: null,
  currentVersion: null,
  updateRequired: false,
  updateAvailable: false,
  error: null,
}

/**
 * 두 버전 문자열을 비교한다. "1.2.3" 형식을 파트 단위로 비교.
 * @returns -1 (a < b), 0 (a === b), 1 (a > b)
 */
function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const partsA = a.split('.').map((p) => parseInt(p, 10) || 0)
  const partsB = b.split('.').map((p) => parseInt(p, 10) || 0)
  const len = Math.max(partsA.length, partsB.length)

  for (let i = 0; i < len; i++) {
    const pa = partsA[i] ?? 0
    const pb = partsB[i] ?? 0
    if (pa < pb) return -1
    if (pa > pb) return 1
  }
  return 0
}

function openStoreUrl(response: VersionCheckResponse): void {
  const platform = Platform.OS as 'ios' | 'android'
  const url = response.storeUrl?.[platform] ?? ''
  if (url) {
    Linking.openURL(url)
  }
}

function showRequiredUpdateAlert(response: VersionCheckResponse): void {
  Alert.alert(
    '업데이트 안내',
    '원활한 사용을 위해 업데이트가 필요합니다.',
    [
      {
        text: '업데이트',
        onPress: () => openStoreUrl(response),
      },
    ],
    { cancelable: false },
  )
}

function showOptionalUpdateAlert(response: VersionCheckResponse): void {
  Alert.alert(
    '업데이트 안내',
    '새 버전이 출시되었습니다. 업데이트하시겠습니까?',
    [
      {
        text: '나중에',
        style: 'destructive',
      },
      {
        text: '업데이트',
        onPress: () => openStoreUrl(response),
      },
    ],
    { cancelable: false },
  )
}

export function useVersionCheck(): VersionCheckState {
  const [state, setState] = useState<VersionCheckState>(initialState)
  const hasChecked = useRef(false)
  const lastResponseRef = useRef<VersionCheckResponse | null>(null)
  const lastUpdateRequired = useRef(false)
  const previousAppState = useRef<AppStateStatus>(AppState.currentState)

  const runVersionCheck = useCallback(async () => {
    if (ENV.isDevelopment) {
      console.info('[useVersionCheck] 개발 환경에서는 버전 검사를 건너뜁니다.')
      const currentVersion = Application.nativeApplicationVersion ?? '0.0.0'
      setState((prev) => ({
        ...prev,
        checking: false,
        currentVersion,
        updateRequired: false,
        updateAvailable: false,
        error: null,
      }))
      return
    }

    const platform = Platform.OS
    if (platform !== 'ios' && platform !== 'android') {
      return
    }

    const currentVersion = Application.nativeApplicationVersion ?? '0.0.0'

    setState((prev) => ({ ...prev, checking: true, currentVersion }))

    try {
      const response = await fetchLatestVersion(platform)
      lastResponseRef.current = response

      const updateRequired =
        response.forceUpdate === true ||
        compareVersions(currentVersion, response.minimumVersion) < 0

      const updateAvailable =
        !updateRequired && compareVersions(currentVersion, response.latestVersion) < 0

      lastUpdateRequired.current = updateRequired

      setState({
        checking: false,
        latestVersion: response.latestVersion,
        currentVersion,
        updateRequired,
        updateAvailable,
        error: null,
      })

      if (updateRequired) {
        showRequiredUpdateAlert(response)
      } else if (updateAvailable) {
        showOptionalUpdateAlert(response)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.warn('[useVersionCheck] 버전 확인 중 오류 발생:', error.message)
      setState((prev) => ({
        ...prev,
        checking: false,
        currentVersion,
        updateRequired: false,
        updateAvailable: false,
        error,
      }))
    }
  }, [])

  // 최초 마운트 시 1회 실행 (StrictMode 이중 실행 방지)
  useEffect(() => {
    if (hasChecked.current) return
    hasChecked.current = true
    runVersionCheck()
  }, [runVersionCheck])

  // AppState 변경 감지: background/inactive → active 복귀 시 강제 업데이트 Alert 재노출
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = previousAppState.current
      previousAppState.current = nextState

      const wasBackground = prev === 'background' || prev === 'inactive'
      const isNowActive = nextState === 'active'

      if (wasBackground && isNowActive && lastUpdateRequired.current && lastResponseRef.current) {
        showRequiredUpdateAlert(lastResponseRef.current)
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  return state
}
