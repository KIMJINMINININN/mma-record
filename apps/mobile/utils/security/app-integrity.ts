/**
 * App integrity verification
 *
 * Android: react-native-google-play-integrity (client-side token only — no backend verification in this PR)
 * iOS: Stub — returns { success: true, isValid: true, method: 'Stub' }
 *      TODO: implement DeviceCheck / App Attest
 *
 * Cloud project number is read from process.env.EXPO_PUBLIC_PLAY_INTEGRITY_PROJECT_NUMBER
 */

import { Platform } from 'react-native'
import { ENV } from '@/config/env'
import type { AppIntegrityResult } from './types'

// ────────────────────────────────────────────────────────────
// Error codes
// ────────────────────────────────────────────────────────────

export const AppIntegrityErrorCode = {
  // Retryable (transient)
  NETWORK_ERROR: '-3',
  TOO_MANY_REQUESTS: '-8',
  GOOGLE_SERVER_UNAVAILABLE: '-12',
  CLIENT_TRANSIENT_ERROR: '-18',
  INTERNAL_ERROR: '-100',
  // Security threats
  APP_NOT_INSTALLED: '-5',
  APP_UID_MISMATCH: '-7',
  // Environment issues
  API_NOT_AVAILABLE: '-1',
  PLAY_STORE_NOT_FOUND: '-2',
  PLAY_STORE_ACCOUNT_NOT_FOUND: '-4',
  PLAY_SERVICES_NOT_FOUND: '-6',
  CANNOT_BIND_TO_SERVICE: '-9',
  PLAY_STORE_VERSION_OUTDATED: '-14',
  PLAY_SERVICES_VERSION_OUTDATED: '-15',
} as const

export const RETRYABLE_ERROR_CODES: string[] = [
  AppIntegrityErrorCode.NETWORK_ERROR,
  AppIntegrityErrorCode.TOO_MANY_REQUESTS,
  AppIntegrityErrorCode.GOOGLE_SERVER_UNAVAILABLE,
  AppIntegrityErrorCode.CLIENT_TRANSIENT_ERROR,
  AppIntegrityErrorCode.INTERNAL_ERROR,
]

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/** Base64 URL-safe encode (React Native compatible, no atob/btoa dependency) */
const base64UrlEncode = (str: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xff)
  }
  let result = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i]
    const b2 = bytes[i + 1]
    const b3 = bytes[i + 2]
    result += chars[b1 >> 2]
    result += chars[((b1 & 3) << 4) | ((b2 ?? 0) >> 4)]
    if (b2 !== undefined) {
      result += chars[((b2 & 15) << 2) | ((b3 ?? 0) >> 6)]
    }
    if (b3 !== undefined) {
      result += chars[b3 & 63]
    }
  }
  return result
}

/**
 * Generates a client-side nonce for Play Integrity.
 * NOTE: In production, the nonce should be generated server-side and sent to the client.
 */
const generateNonce = (): string => {
  const ts = Date.now().toString()
  const r1 = Math.random().toString(36).substring(2)
  const r2 = Math.random().toString(36).substring(2)
  const r3 = Math.random().toString(36).substring(2)
  return base64UrlEncode(`${ts}${r1}${r2}${r3}`)
}

/** Exponential back-off retry helper */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000,
): Promise<{ result: T; retryCount: number }> => {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()
      return { result, retryCount: attempt }
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.warn(`[integrity] retry ${attempt + 1}/${maxRetries} in ${delay / 1000}s`)
        await new Promise<void>((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

// Lazy require to avoid crash when native module is not yet linked (pre-prebuild)
const getPlayIntegrityModule = (): { requestIntegrityToken: (nonce: string, cloudProjectNumber: string) => Promise<string> } | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-google-play-integrity').default
  } catch {
    console.warn('[integrity] react-native-google-play-integrity not available')
    return null
  }
}

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────

/**
 * Requests a Play Integrity token from Google.
 * Client-side only — the caller is responsible for backend verification.
 */
export const getPlayIntegrityToken = async (
  cloudProjectNumber: string,
): Promise<{ success: boolean; token?: string; error?: string; errorCode?: string }> => {
  if (Platform.OS !== 'android') {
    return { success: false, error: 'Play Integrity is only available on Android' }
  }

  const PlayIntegrity = getPlayIntegrityModule()
  if (!PlayIntegrity) {
    return { success: false, error: 'Play Integrity module not available', errorCode: AppIntegrityErrorCode.API_NOT_AVAILABLE }
  }

  try {
    const nonce = generateNonce()
    const token = await PlayIntegrity.requestIntegrityToken(nonce, cloudProjectNumber)
    return { success: true, token }
  } catch (error: unknown) {
    const err = error as { code?: string | number; message?: string }
    const errorCode = err?.code != null ? String(err.code) : undefined
    console.error('[integrity] Play Integrity token request failed:', { errorCode, message: err?.message })
    return { success: false, error: err?.message ?? 'Unknown error', errorCode }
  }
}

/**
 * Checks if the app was installed from a recognized app store (Android only).
 * Uses expo-application to read the installer package name.
 */
export const checkAndroidInstaller = async (): Promise<{
  isValid: boolean
  installer?: string
  error?: string
}> => {
  if (Platform.OS !== 'android') {
    return { isValid: false, error: 'Only available on Android' }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Application = require('expo-application')
    const installer: string | null = await Application.getInstallReferrerAsync?.() ?? null

    const validInstallers = [
      'com.android.vending',              // Google Play Store
      'com.google.android.packageinstaller', // Google Package Installer
      'com.sec.android.app.samsungapps',  // Samsung Galaxy Store
      'com.amazon.venezia',               // Amazon App Store
    ]

    const isValid = installer != null && validInstallers.includes(installer)
    return { isValid, installer: installer ?? 'unknown' }
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('[integrity] checkAndroidInstaller failed:', error)
    return { isValid: false, error: err?.message ?? 'Unknown error' }
  }
}

/**
 * Unified app integrity check.
 *
 * Android:
 *  - If cloudProjectNumber is empty, skips Play Integrity and returns success with method 'Skipped'.
 *  - Otherwise attempts Play Integrity token generation with exponential back-off.
 *  - Does NOT perform backend verification (out of scope for this PR).
 *
 * iOS:
 *  - Returns stub { success: true, isValid: true, method: 'Stub' }.
 *  - TODO: implement DeviceCheck / App Attest via a Swift config plugin.
 */
export const checkAppIntegrity = async (options?: {
  cloudProjectNumber?: string
  skipInDevelopment?: boolean
}): Promise<AppIntegrityResult> => {
  const { skipInDevelopment = true, cloudProjectNumber = '' } = options ?? {}

  // Skip in development mode if requested
  if (skipInDevelopment && ENV.isDevelopment) {
    console.warn('[integrity] App integrity check skipped in development mode')
    return {
      success: true,
      isValid: true,
      platform: Platform.OS as 'ios' | 'android',
      environment: 'development',
      method: 'Skipped',
    }
  }

  // ── iOS stub ──────────────────────────────────────────────
  if (Platform.OS === 'ios') {
    // TODO: implement DeviceCheck / App Attest integrity check for iOS
    return {
      success: true,
      isValid: true,
      platform: 'ios',
      method: 'Stub',
    }
  }

  // ── Android ───────────────────────────────────────────────
  if (Platform.OS === 'android') {
    // No cloud project number configured — skip gracefully
    if (!cloudProjectNumber) {
      console.warn('[integrity] EXPO_PUBLIC_PLAY_INTEGRITY_PROJECT_NUMBER not set — skipping Play Integrity')
      return {
        success: true,
        isValid: true,
        platform: 'android',
        method: 'Skipped',
      }
    }

    // Attempt token generation with exponential back-off for retryable errors
    let tokenResult: { success: boolean; token?: string; error?: string; errorCode?: string }
    let retryCount = 0

    try {
      const retryResult = await retryWithBackoff(async () => {
        const result = await getPlayIntegrityToken(cloudProjectNumber)
        if (!result.success && result.errorCode && RETRYABLE_ERROR_CODES.includes(result.errorCode)) {
          throw Object.assign(new Error(result.error), { code: result.errorCode })
        }
        return result
      })
      tokenResult = retryResult.result
      retryCount = retryResult.retryCount
    } catch (retryError: unknown) {
      const err = retryError as { code?: string | number; message?: string }
      const errorCode = err?.code != null ? String(err.code) : undefined
      return {
        success: false,
        isValid: false,
        platform: 'android',
        error: err?.message ?? 'Failed to get Play Integrity token after retries',
        errorCode,
        retryCount,
      }
    }

    if (!tokenResult.success || !tokenResult.token) {
      return {
        success: false,
        isValid: false,
        platform: 'android',
        error: tokenResult.error ?? 'Failed to get Play Integrity token',
        errorCode: tokenResult.errorCode,
        retryCount,
      }
    }

    // Token obtained — return it for the caller to verify server-side.
    // Backend verification is OUT OF SCOPE for this PR.
    return {
      success: true,
      isValid: true, // optimistic — caller should verify token server-side
      platform: 'android',
      method: 'PlayIntegrity',
      details: {
        // Token is intentionally omitted from the result shape to avoid logging it.
        // Pass token to your backend separately via getPlayIntegrityToken().
      },
      retryCount,
    }
  }

  return {
    success: false,
    isValid: false,
    platform: Platform.OS as 'ios' | 'android',
    error: 'Unsupported platform',
  }
}
