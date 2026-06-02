/**
 * Security check utilities
 *
 * Primary backend: expo-device (emulator/simulator detection)
 * Fallback: jail-monkey (rooting, hooking, debugger, trust-fall)
 *
 * No crash reporter — all logging via console.error / console.warn
 */

import { Platform } from 'react-native'
import * as Device from 'expo-device'
import { ENV } from '@/config/env'
import type { DetailedSecurityResult, ThreatLevel, ThreatType } from './types'

// Lazy require jail-monkey to avoid crash when native module is absent (pre-prebuild)
const getJailMonkey = (): typeof import('jail-monkey').default | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const JM = require('jail-monkey').default
    return JM
  } catch {
    console.warn('[security] jail-monkey native module not available — skipping jail-monkey checks')
    return null
  }
}

/**
 * Rooting / jailbreak detection
 * Uses jail-monkey as primary; returns true (threat) if the module is unavailable in production.
 */
export const checkRootedOrJailbroken = (): boolean => {
  try {
    const JailMonkey = getJailMonkey()
    if (!JailMonkey) {
      // Module absent — treat as threat in production, safe in development
      return !ENV.isDevelopment
    }
    return JailMonkey.isJailBroken()
  } catch (error) {
    console.error('[security] checkRootedOrJailbroken failed:', error)
    return !ENV.isDevelopment
  }
}

/**
 * Debugger detection (async)
 */
export const checkDebuggerAttached = async (): Promise<boolean> => {
  try {
    const JailMonkey = getJailMonkey()
    if (!JailMonkey) {
      return false
    }
    return await JailMonkey.isDebuggedMode()
  } catch (error) {
    console.error('[security] checkDebuggerAttached failed:', error)
    return false
  }
}

/**
 * Hook detection (Frida, Xposed, etc.)
 */
export const checkHookDetected = (): boolean => {
  try {
    const JailMonkey = getJailMonkey()
    if (!JailMonkey) {
      return false
    }
    return JailMonkey.hookDetected()
  } catch (error) {
    console.error('[security] checkHookDetected failed:', error)
    return false
  }
}

/**
 * External storage detection (Android only)
 */
export const checkExternalStorage = (): boolean => {
  try {
    if (Platform.OS !== 'android') {
      return false
    }
    const JailMonkey = getJailMonkey()
    if (!JailMonkey) {
      return false
    }
    return JailMonkey.isOnExternalStorage()
  } catch (error) {
    console.error('[security] checkExternalStorage failed:', error)
    return false
  }
}

/**
 * ADB enabled detection (Android only)
 */
export const checkAdbEnabled = (): boolean => {
  try {
    if (Platform.OS !== 'android') {
      return false
    }
    const JailMonkey = getJailMonkey()
    if (!JailMonkey) {
      return false
    }
    return JailMonkey.AdbEnabled()
  } catch (error) {
    console.error('[security] checkAdbEnabled failed:', error)
    return false
  }
}

/**
 * Simulator / emulator detection
 * Primary: expo-device (Device.isDevice === false means emulator/simulator)
 * Fallback: not needed — expo-device covers this cross-platform
 */
export const checkSimulator = async (): Promise<boolean> => {
  try {
    // expo-device: isDevice is false on simulators/emulators
    const isPhysicalDevice = Device.isDevice
    return !isPhysicalDevice
  } catch (error) {
    console.error('[security] checkSimulator failed:', error)
    return false
  }
}

/**
 * Trust-fall check via jail-monkey
 */
export const checkTrustFall = (): boolean => {
  try {
    const JailMonkey = getJailMonkey()
    if (!JailMonkey) {
      return true // safe default when module absent
    }
    return JailMonkey.trustFall()
  } catch (error) {
    console.error('[security] checkTrustFall failed:', error)
    return true
  }
}

// ────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────

const calculateThreatLevel = (threats: string[]): ThreatLevel => {
  if (threats.length === 0) return 'NONE'
  if (threats.length === 1) {
    if (threats.includes('ADB_ENABLED')) return 'LOW'
    if (threats.includes('EXTERNAL_STORAGE')) return 'MEDIUM'
    return 'HIGH'
  }
  if (
    threats.includes('ROOT_JAILBREAK') ||
    threats.includes('HOOKING') ||
    threats.includes('DEBUGGER')
  ) {
    return 'CRITICAL'
  }
  return 'HIGH'
}

const determineThreatType = (threats: string[]): ThreatType => {
  if (threats.length === 0) return 'NONE'
  if (threats.length > 1) return 'MULTIPLE_THREATS'
  const threat = threats[0]
  switch (threat) {
    case 'ROOT_JAILBREAK':
      return Platform.OS === 'ios' ? 'JAILBREAK_DETECTED' : 'ROOT_DETECTED'
    case 'HOOKING':
      return 'HOOKING_DETECTED'
    case 'DEBUGGER':
      return 'DEBUGGER_DETECTED'
    case 'MOCK_LOCATION':
      return 'MOCK_LOCATION_DETECTED'
    case 'EXTERNAL_STORAGE':
      return 'EXTERNAL_STORAGE_DETECTED'
    case 'ADB_ENABLED':
      return 'ADB_ENABLED'
    case 'SIMULATOR':
      return 'SIMULATOR_DETECTED'
    default:
      return 'NONE'
  }
}

// ────────────────────────────────────────────────────────────
// Composite checks
// ────────────────────────────────────────────────────────────

/**
 * Full detailed security check.
 * SIMULATOR check is skipped when ENV.isDevelopment is true.
 */
export const performDetailedSecurityCheck = async (): Promise<DetailedSecurityResult> => {
  try {
    const checks = {
      isRooted: false,
      isJailbroken: false,
      canMockLocation: false,
      isDebugged: false,
      hookDetected: false,
      isOnExternalStorage: false,
      adbEnabled: false,
      isSimulator: false,
    }

    const threats: string[] = []
    const details: string[] = []

    // 1. Rooting / jailbreak
    const isJailBroken = checkRootedOrJailbroken()
    if (isJailBroken) {
      if (Platform.OS === 'ios') {
        checks.isJailbroken = true
        details.push('탈옥된 기기 감지')
      } else {
        checks.isRooted = true
        details.push('루팅된 기기 감지')
      }
      threats.push('ROOT_JAILBREAK')
    }

    // 2. Hook detection
    const hasHook = checkHookDetected()
    if (hasHook) {
      checks.hookDetected = true
      threats.push('HOOKING')
      details.push('후킹 프레임워크 감지 (Frida, Xposed 등)')
    }

    // 3. Debugger (skipped in development)
    if (!ENV.isDevelopment) {
      const isDebugged = await checkDebuggerAttached()
      if (isDebugged) {
        checks.isDebugged = true
        threats.push('DEBUGGER')
        details.push('디버거 연결 감지')
      }
    }

    // 4. External storage (Android only)
    if (Platform.OS === 'android') {
      const isExternal = checkExternalStorage()
      if (isExternal) {
        checks.isOnExternalStorage = true
        threats.push('EXTERNAL_STORAGE')
        details.push('앱이 외부 저장소에 설치됨')
      }
    }

    // 5. Simulator / emulator (skipped in development)
    if (!ENV.isDevelopment) {
      const isSimulator = await checkSimulator()
      if (isSimulator) {
        checks.isSimulator = true
        threats.push('SIMULATOR')
        details.push(Platform.OS === 'ios' ? 'iOS 시뮬레이터 감지' : 'Android 에뮬레이터 감지')
      }
    }

    const threatLevel = calculateThreatLevel(threats)
    const threatType = determineThreatType(threats)
    const isSecure = threats.length === 0

    return {
      success: true,
      isSecure,
      threatLevel,
      threatType,
      details,
      checks,
    }
  } catch (error) {
    console.error('[security] performDetailedSecurityCheck failed:', error)
    return {
      success: false,
      isSecure: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    }
  }
}

/**
 * Quick rooting / jailbreak check only
 */
export const quickRootCheck = (): boolean => {
  try {
    return checkRootedOrJailbroken()
  } catch (error) {
    console.error('[security] quickRootCheck failed:', error)
    return !ENV.isDevelopment
  }
}
