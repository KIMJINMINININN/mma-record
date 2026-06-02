// Security threat code prefix taxonomy
// Korean alert messages are Option C — rewritten, no brand strings

export const SecurityThreatCode = {
  ROOT_DETECTED: {
    prefix: 'R001',
    message: '기기 보안 상태 확인에 실패했습니다.\n\n앱을 종료합니다.',
  },
  JAILBREAK_DETECTED: {
    prefix: 'J001',
    message: '기기 보안 상태 확인에 실패했습니다.\n\n앱을 종료합니다.',
  },
  HOOKING_DETECTED: {
    prefix: 'H001',
    message: '기기 보안 상태 확인에 실패했습니다.\n\n앱을 종료합니다.',
  },
  DEBUGGER_DETECTED: {
    prefix: 'D001',
    message: '기기 보안 상태 확인에 실패했습니다.\n\n앱을 종료합니다.',
  },
  MOCK_LOCATION_DETECTED: {
    prefix: 'L001',
    message: '기기 보안 상태 확인에 실패했습니다.\n\n앱을 종료합니다.',
  },
  EXTERNAL_STORAGE_DETECTED: {
    prefix: 'S001',
    message: '기기 보안 상태 확인에 실패했습니다.\n\n앱을 종료합니다.',
  },
  ADB_ENABLED: {
    prefix: 'A001',
    message: '기기 보안 상태 확인에 실패했습니다.\n\n앱을 종료합니다.',
  },
  SIMULATOR_DETECTED: {
    prefix: 'E001',
    message: '기기 보안 상태 확인에 실패했습니다.\n\n앱을 종료합니다.',
  },
  MULTIPLE_THREATS: {
    prefix: 'M001',
    message: '기기 보안 상태 확인에 실패했습니다.\n\n앱을 종료합니다.',
  },
  UNKNOWN: {
    prefix: 'U001',
    message: '기기 보안 상태 확인에 실패했습니다.\n\n앱을 종료합니다.',
  },
} as const

// App integrity verification code prefix taxonomy
export const IntegrityThreatCode = {
  DEFAULT: {
    prefix: 'I001',
    message: '앱 무결성 검증에 실패했습니다.\n\n정식 경로로 재설치해주세요.',
  },
  TRANSIENT: {
    prefix: 'I002',
    message: '일시적인 오류가 발생했습니다. 앱을 다시 실행해주세요.',
  },
  TAMPERED: {
    prefix: 'I003',
    message: '앱 무결성 검증에 실패했습니다.\n\n정식 경로로 재설치해주세요.',
  },
  PLATFORM: {
    prefix: 'I004',
    message: '앱 무결성 검증에 실패했습니다.\n\n정식 경로로 재설치해주세요.',
  },
  RECOVERED: {
    prefix: 'I005',
    message: '',
  },
} as const

// Threat level suffix mapping
export const ThreatLevelSuffix: Record<string, string> = {
  LOW: 'L',
  MEDIUM: 'M',
  HIGH: 'H',
  CRITICAL: 'C',
}

export type ThreatEntry = { readonly prefix: string; readonly message: string }

/**
 * Generates a full security threat code string with level suffix
 * e.g. getSecurityThreatCode('ROOT_DETECTED', 'CRITICAL') => { code: 'R001-C', message: '...' }
 */
export const getSecurityThreatCode = (
  threatType: string,
  threatLevel: string,
): { code: string; message: string } => {
  const entry =
    SecurityThreatCode[threatType as keyof typeof SecurityThreatCode] ??
    SecurityThreatCode.UNKNOWN
  const suffix = ThreatLevelSuffix[threatLevel] ?? 'C'
  return {
    code: `${entry.prefix}-${suffix}`,
    message: entry.message,
  }
}

/**
 * Generates a full integrity threat code string with level suffix
 * e.g. getIntegrityThreatCode(IntegrityThreatCode.TAMPERED, 'HIGH') => { code: 'I003-H', message: '...' }
 */
export const getIntegrityThreatCode = (
  entry: ThreatEntry,
  threatLevel: string,
): { code: string; message: string } => {
  const suffix = ThreatLevelSuffix[threatLevel] ?? 'C'
  return {
    code: `${entry.prefix}-${suffix}`,
    message: entry.message,
  }
}
