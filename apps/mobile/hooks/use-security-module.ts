/**
 * useSecurityModule
 *
 * Runs a security gate on mount:
 *  1. Quick root check
 *  2. App integrity verification (Play Integrity on Android, stub on iOS)
 *  3. Full detailed security check (blocks on HIGH/CRITICAL threats)
 *  4. 5-minute periodic re-check via quickRootCheck
 *
 * iOS note: BackHandler.exitApp() is Android-only. On iOS the blocking alert
 * persists and the user cannot dismiss it (cancelable: false). This is the
 * intended behavior — there is no programmatic exit API on iOS.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Alert, BackHandler, Platform } from 'react-native'
import {
  performDetailedSecurityCheck,
  quickRootCheck,
  checkAppIntegrity,
  getCurrentSignatureHash,
  verifySignatureHash,
  getSecurityThreatCode,
  getIntegrityThreatCode,
  IntegrityThreatCode,
  SecurityThreatCode,
} from '@/utils/security'
import { ENV } from '@/config/env'

// ────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────

/**
 * Shows a blocking, non-dismissable alert.
 * On Android, pressing "확인" calls BackHandler.exitApp() to terminate the app.
 * On iOS, pressing "확인" re-shows the same alert — there is no programmatic exit.
 */
const showBlockingThreatAlert = (message: string): void => {
  const showAlert = () => {
    Alert.alert(
      '보안 위협 감지',
      message,
      [
        {
          text: '확인',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS === 'android') {
              BackHandler.exitApp()
            } else {
              // iOS: re-show alert to keep the user blocked
              setTimeout(showAlert, 100)
            }
          },
        },
      ],
      { cancelable: false },
    )
  }

  showAlert()
}

// ────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────

export function useSecurityModule(): {
  securityPassed: boolean
  securityChecking: boolean
  verifyAppSignature: () => Promise<boolean>
  verifyAppIntegrity: () => Promise<boolean>
} {
  // In development mode security starts as passed/not-checking.
  // This matches checks.ts behavior: SIMULATOR check is skipped in isDevelopment,
  // and other checks (rooting, hooking, debugger) still run but bail early if
  // jail-monkey is absent (pre-prebuild), returning false (safe default).
  const [securityPassed, setSecurityPassed] = useState(ENV.isDevelopment)
  const [securityChecking, setSecurityChecking] = useState(!ENV.isDevelopment)

  // Use a ref for the interval so the cleanup function always refers to the
  // latest interval ID regardless of early-return paths.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const initializeAppSecurity = async () => {
      if (ENV.isDevelopment) {
        // Skip full gate in development; hook already initialized with passed state.
        return
      }

      try {
        console.warn('[security] 보안 모듈 초기화 시작')

        // ── Step 1: Quick root/jailbreak check ─────────────────
        const isRootedQuick = quickRootCheck()
        if (isRootedQuick) {
          console.warn('[security] 루팅/탈옥 기기 감지 - 앱 차단')
          const threatType = Platform.OS === 'ios' ? 'JAILBREAK_DETECTED' : 'ROOT_DETECTED'
          const threat = getSecurityThreatCode(threatType, 'CRITICAL')
          showBlockingThreatAlert(`${threat.message}\n\n오류 코드: ${threat.code}`)
          setSecurityChecking(false)
          return
        }

        // ── Step 2: App integrity verification ─────────────────
        console.warn('[security] 앱 무결성 검증 시작')
        const integrityResult = await checkAppIntegrity({
          cloudProjectNumber: process.env.EXPO_PUBLIC_PLAY_INTEGRITY_PROJECT_NUMBER ?? '',
          skipInDevelopment: ENV.isDevelopment,
        })

        if (!integrityResult.isValid) {
          console.warn('[security] 앱 무결성 검증 실패:', integrityResult)

          const { errorCode } = integrityResult
          let entry: { readonly prefix: string; readonly message: string } =
            IntegrityThreatCode.DEFAULT

          // Map error codes to integrity threat entries
          // RETRYABLE_ERROR_CODES are imported indirectly via checkAppIntegrity;
          // use the errorCode string directly here.
          const retryableCodes = ['-3', '-8', '-12', '-18', '-100']
          if (errorCode && (retryableCodes.includes(errorCode) || errorCode === 'SERVER_ERROR')) {
            entry = IntegrityThreatCode.TRANSIENT
          } else if (integrityResult.details?.verificationStatus === 'unverified') {
            entry = IntegrityThreatCode.TAMPERED
          } else if (integrityResult.details?.verificationStatus === 'failed') {
            entry = IntegrityThreatCode.TRANSIENT
          } else if (errorCode) {
            entry = IntegrityThreatCode.PLATFORM
          }

          const threat = getIntegrityThreatCode(entry, 'CRITICAL')
          showBlockingThreatAlert(`${threat.message}\n\n오류 코드: ${threat.code}`)
          setSecurityChecking(false)
          return
        }

        console.warn('[security] 앱 무결성 검증 통과')

        // ── Step 3: Detailed security check ────────────────────
        const initialCheck = await performDetailedSecurityCheck()

        if (!initialCheck.success) {
          console.warn('[security] 상세 보안 검증 실패:', initialCheck.error)
          const threat = getSecurityThreatCode('UNKNOWN', 'CRITICAL')
          showBlockingThreatAlert(`${threat.message}\n\n오류 코드: ${threat.code}`)
          setSecurityChecking(false)
          return
        }

        if (!initialCheck.isSecure) {
          console.warn('[security] 보안 위협 감지:', initialCheck.threatType)
          // Block on HIGH or CRITICAL only
          if (initialCheck.threatLevel === 'HIGH' || initialCheck.threatLevel === 'CRITICAL') {
            const threat = getSecurityThreatCode(
              initialCheck.threatType ?? 'UNKNOWN',
              initialCheck.threatLevel ?? 'CRITICAL',
            )
            showBlockingThreatAlert(`${threat.message}\n\n오류 코드: ${threat.code}`)
            setSecurityChecking(false)
            return
          }

          // LOW / MEDIUM — log and continue
          console.warn('[security] 낮은 수준의 보안 위협 감지 - 앱 진행 허용:', initialCheck.details)
        }

        // ── Step 4: 5-minute periodic re-check ─────────────────
        intervalRef.current = setInterval(() => {
          try {
            const isCompromised = quickRootCheck()
            if (isCompromised) {
              console.warn('[security] 주기적 검증 - 루팅/탈옥 감지')
              const threatType = Platform.OS === 'ios' ? 'JAILBREAK_DETECTED' : 'ROOT_DETECTED'
              const threat = getSecurityThreatCode(threatType, 'CRITICAL')
              showBlockingThreatAlert(`${threat.message}\n\n오류 코드: ${threat.code}`)
              if (Platform.OS === 'android') {
                BackHandler.exitApp()
              }
            }
          } catch (error) {
            console.error('[security] 주기적 보안 검증 실패:', error)
          }
        }, 5 * 60 * 1000) // 5 minutes

        // Security passed
        setSecurityPassed(true)
        setSecurityChecking(false)
        console.warn('[security] 보안 검증 통과 - 앱 시작 가능')
      } catch (error) {
        console.error('[security] 보안 모듈 초기화 실패:', error)
        const threat = getSecurityThreatCode('UNKNOWN', 'CRITICAL')
        showBlockingThreatAlert(`${SecurityThreatCode.UNKNOWN.message}\n\n오류 코드: ${threat.code}`)
        setSecurityPassed(false)
        setSecurityChecking(false)
      }
    }

    initializeAppSecurity()

    // Cleanup: always clear the interval, even when initializeAppSecurity
    // returns early (interval will be null in those cases — clearInterval(null) is a no-op).
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  // ── verifyAppSignature ──────────────────────────────────────
  // Reads expected hash from env vars. Returns true if env var is empty (dev-friendly).
  // On mismatch, shows a blocking alert with the TAMPERED integrity message.
  const verifyAppSignature = useCallback(async (): Promise<boolean> => {
    try {
      const expected =
        Platform.OS === 'ios'
          ? (process.env.EXPO_PUBLIC_IOS_SIGNATURE_HASH ?? '')
          : (process.env.EXPO_PUBLIC_ANDROID_SIGNATURE_HASH ?? '')

      if (!expected) {
        // Env var not set — skip verification (dev mode / not configured yet)
        return true
      }

      const isValid = verifySignatureHash(expected)
      if (!isValid) {
        console.error('[security] 앱 서명 불일치 - 변조된 앱')
        const threat = getIntegrityThreatCode(IntegrityThreatCode.TAMPERED, 'CRITICAL')
        showBlockingThreatAlert(`${threat.message}\n\n오류 코드: ${threat.code}`)
        return false
      }

      return true
    } catch (error) {
      console.error('[security] 앱 서명 검증 실패:', error)
      const threat = getSecurityThreatCode('UNKNOWN', 'CRITICAL')
      showBlockingThreatAlert(`${SecurityThreatCode.UNKNOWN.message}\n\n오류 코드: ${threat.code}`)
      return false
    }
  }, [])

  // ── verifyAppIntegrity ──────────────────────────────────────
  // iOS always returns true (stub). Android calls checkAppIntegrity.
  // If the Play Integrity native module is not yet linked (pre-prebuild Phase 1.4),
  // the error is caught, logged, and true is returned (graceful degradation).
  const verifyAppIntegrity = useCallback(async (): Promise<boolean> => {
    // iOS stub — Play Integrity is Android-only
    if (Platform.OS === 'ios') {
      return true
    }

    try {
      const result = await checkAppIntegrity({
        cloudProjectNumber: process.env.EXPO_PUBLIC_PLAY_INTEGRITY_PROJECT_NUMBER ?? '',
        skipInDevelopment: ENV.isDevelopment,
      })

      if (!result.isValid) {
        console.error('[security] 앱 무결성 검증 실패 (explicit call):', result)
        return false
      }

      return true
    } catch (error) {
      // Graceful degradation: native module not yet linked (pre-prebuild)
      console.warn('[security] verifyAppIntegrity — module unavailable or error, degrading gracefully:', error)
      return true
    }
  }, [])

  return {
    securityPassed,
    securityChecking,
    verifyAppSignature,
    verifyAppIntegrity,
  }
}
