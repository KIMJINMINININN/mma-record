/**
 * 타임존 큐레이트 목록 (F1-AC3) — IANA TZ id 일부.
 *
 * 전체 400여 개를 덤프하지 않고, 한국 사용자 기준 자주 쓰는 12개만 추린다.
 * `Asia/Seoul`이 첫 항목 = 기본값(profiles.timezone default 'Asia/Seoul' 정합 / Develop §0003).
 * label은 도시명(한글) + IANA id 병기 → 셀렉트에서 식별 쉬움.
 */
export interface TimezoneOption {
  /** IANA TZ id (DB profiles.timezone에 그대로 저장) */
  id: string;
  /** 표시 라벨 (예: '서울 (Asia/Seoul)') */
  label: string;
}

export const TIMEZONES: readonly TimezoneOption[] = [
  { id: 'Asia/Seoul', label: '서울 (Asia/Seoul)' },
  { id: 'Asia/Tokyo', label: '도쿄 (Asia/Tokyo)' },
  { id: 'Asia/Shanghai', label: '상하이 (Asia/Shanghai)' },
  { id: 'Asia/Singapore', label: '싱가포르 (Asia/Singapore)' },
  { id: 'Asia/Dubai', label: '두바이 (Asia/Dubai)' },
  { id: 'Europe/London', label: '런던 (Europe/London)' },
  { id: 'Europe/Paris', label: '파리 (Europe/Paris)' },
  { id: 'America/New_York', label: '뉴욕 (America/New_York)' },
  { id: 'America/Los_Angeles', label: '로스앤젤레스 (America/Los_Angeles)' },
  { id: 'America/Sao_Paulo', label: '상파울루 (America/Sao_Paulo)' },
  { id: 'Australia/Sydney', label: '시드니 (Australia/Sydney)' },
  { id: 'UTC', label: '협정세계시 (UTC)' },
] as const;

/** profiles.timezone 기본값과 동일 (Develop §0003). */
export const DEFAULT_TIMEZONE = 'Asia/Seoul';
