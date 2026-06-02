/**
 * Security module shared TypeScript types
 */

export type ThreatLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type ThreatType =
  | 'NONE'
  | 'ROOT_DETECTED'
  | 'JAILBREAK_DETECTED'
  | 'HOOKING_DETECTED'
  | 'DEBUGGER_DETECTED'
  | 'MOCK_LOCATION_DETECTED'
  | 'EXTERNAL_STORAGE_DETECTED'
  | 'ADB_ENABLED'
  | 'SIMULATOR_DETECTED'
  | 'MULTIPLE_THREATS'

export interface SecurityCheckResult {
  isSecure: boolean
  isTampered: boolean
  threatLevel: ThreatLevel
  threatType: ThreatType
  details: string[]
  timestamp: string
}

export interface DetailedSecurityResult {
  success: boolean
  isSecure: boolean
  threatLevel?: ThreatLevel
  threatType?: ThreatType
  details?: string[]
  error?: string
  checks?: {
    isRooted: boolean
    isJailbroken: boolean
    canMockLocation: boolean
    isDebugged: boolean
    hookDetected: boolean
    isOnExternalStorage: boolean
    adbEnabled: boolean
    isSimulator: boolean
  }
}

export interface AppIntegrityResult {
  success: boolean
  isValid: boolean
  platform: 'ios' | 'android'
  environment?: string // appstore | testflight | playstore | development | unknown
  method?: 'StoreKit2' | 'Legacy' | 'PlayIntegrity' | 'InstallerCheck' | 'Stub' | 'Skipped'
  details?: {
    // Android
    appRecognitionVerdict?: string
    deviceRecognitionVerdict?: string[]
    appLicensingVerdict?: string
    // iOS
    hasReceipt?: boolean
    bundleId?: string
    isCodeSigned?: boolean
    verificationStatus?: string
    originalAppVersion?: string
    usedRefresh?: boolean
    sharedError?: string
  }
  retryCount?: number
  error?: string
  errorCode?: string
}
