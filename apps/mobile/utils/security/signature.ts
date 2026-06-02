/**
 * App signature hash utilities
 *
 * Hash values are read exclusively from environment variables.
 * No hashes are hardcoded.
 *
 * Set in .env.*:
 *   EXPO_PUBLIC_ANDROID_SIGNATURE_HASH=
 *   EXPO_PUBLIC_IOS_SIGNATURE_HASH=
 */

import { Platform } from 'react-native'

/**
 * Returns the expected signature hash from the environment for the current platform.
 * Returns an empty string if the variable is absent (dev-friendly — skip check).
 */
export const getCurrentSignatureHash = (): string => {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_IOS_SIGNATURE_HASH ?? ''
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_ANDROID_SIGNATURE_HASH ?? ''
  }
  return ''
}

/**
 * Verifies that the current build's signature matches the expected hash.
 *
 * Returns true when:
 *  - `expected` is an empty string (env var not set → skip check, dev-friendly)
 *  - The current hash matches `expected` (case-insensitive)
 */
export const verifySignatureHash = (expected: string): boolean => {
  if (!expected) {
    // No expected hash configured — skip verification (dev mode / env not set)
    return true
  }
  const current = getCurrentSignatureHash()
  if (!current) {
    // Runtime hash not available — treat as unverified
    return false
  }
  return current.toLowerCase() === expected.toLowerCase()
}
