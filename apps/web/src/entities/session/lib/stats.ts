import dayjs from 'dayjs';
import { DISCIPLINES, type Discipline, type PositionKind } from '@/shared/model/enums';

/**
 * F10 통계 집계 — 순수 함수 (PRD §F10 · 구현계획 §4).
 *
 * 매트 타임 합계 / 종목별 세션 분포 / 주·월 빈도 / 스트릭(연속 훈련일) / 최다 복습 기술을
 * 클라이언트에서 받은 세션 행 배열로부터 계산한다. **DB 집계(RPC/뷰) 없음** — 잠금된 결정.
 *
 * 시계 비의존(테스트 결정성): 윈도우/스트릭 함수는 기준 날짜 `today`('YYYY-MM-DD')를 인자로 받는다.
 * 주(week)는 **일요일 시작**(캘린더 §F2와 동일 컨벤션) — 주의 시작 날짜 문자열을 키로 써
 * 연말 경계가 구조적으로 안전하다(별도 isoWeek 플러그인 불필요, 코어 dayjs만 사용).
 *
 * 레이어: entities/session/lib — React/Supabase 의존 없음(dayjs 유틸만).
 * 날짜는 trained_on('YYYY-MM-DD', KST)을 신뢰한다(클라이언트가 KST 보정 입력, Develop §4.3).
 */

export const DATE_FMT = 'YYYY-MM-DD';
/** 주간 빈도 "습관 형성" 목표선 (PRD §10 — 주 3회 이상). */
export const WEEKLY_GOAL = 3;

/**
 * 기간 필터 구간 (F10 P2). 'all'=전체, 나머지는 today 기준 최근 N개월.
 * 집계량(매트타임·종목분포·포지션·최다복습)에만 적용 — 시계열 지표(스트릭·빈도)는 전체 유지.
 */
export type StatPeriod = 'all' | '6m' | '3m' | '1m';
export const STAT_PERIODS: { id: StatPeriod; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: '6m', label: '6개월' },
  { id: '3m', label: '3개월' },
  { id: '1m', label: '1개월' },
];

/** 집계 입력용 슬림 세션 행 (fetchAllSessionStatRows가 반환). */
export type StatSessionRow = {
  /** 'YYYY-MM-DD' (KST 날짜) */
  trained_on: string;
  /** 매트 타임(분). null = 미기록 → 합산 시 0 취급. */
  duration_min: number | null;
  /** N:M 종목(한 세션에 복수 가능). */
  disciplines: Discipline[];
};

/** session_techniques → techniques 평탄화 직전의 원시 행 (최다 복습·포지션 분포 집계 입력). */
export type SessionTechniqueRow = {
  technique_id: string;
  /** 소속 세션 훈련일('YYYY-MM-DD') — 기간 필터용(F10 P2). */
  trained_on: string;
  techniques: { id: string; name: string; discipline: Discipline; position: PositionKind | null } | null;
};

/** 빈도 차트 버킷 1개(주 또는 월). */
export type FrequencyBucket = { key: string; label: string; count: number };
export type StreakResult = { current: number; longest: number };
/** 스트릭 점 행의 하루. */
export type StreakDay = { dateISO: string; trained: boolean; isToday: boolean };
export type TopTechnique = { id: string; name: string; discipline: Discipline; count: number };
/** 포지션별 출현 수 (F10 P2 — 다룬 기술의 position 집계, count>0 내림차순). */
export type PositionCount = { position: PositionKind; count: number };

export interface TrainingStats {
  totalMatMinutes: number;
  sessionCount: number;
  /** 종목별 세션 수 — 전 종목 키 존재(enum-exhaustive). 2종목 세션은 양쪽 +1. */
  disciplineDistribution: Record<Discipline, number>;
  weekly: FrequencyBucket[];
  monthly: FrequencyBucket[];
  streak: StreakResult;
}

// ---------------------------------------------------------------------------
// 기간 필터 (F10 P2) — 집계량 지표에만 적용
// ---------------------------------------------------------------------------

/** period 시작 경계(포함, 'YYYY-MM-DD'). 'all'이면 null(필터 없음). today 기준 최근 N개월. */
export function periodStartISO(today: string, period: StatPeriod): string | null {
  if (period === 'all') return null;
  const months = period === '6m' ? 6 : period === '3m' ? 3 : 1;
  return dayjs(today).subtract(months, 'month').format(DATE_FMT);
}

/** trained_on이 period 시작 이후(포함)인 행만. 문자열 비교('YYYY-MM-DD' 사전순=시간순, DST 무관). */
export function filterByPeriod<T extends { trained_on: string }>(
  rows: T[],
  today: string,
  period: StatPeriod,
): T[] {
  const start = periodStartISO(today, period);
  if (start === null) return rows;
  return rows.filter((r) => r.trained_on >= start);
}

// ---------------------------------------------------------------------------
// 매트 타임 / 종목 분포
// ---------------------------------------------------------------------------

/** 총 매트 타임(분). null duration_min은 0으로(NaN 방지). */
export function totalMatMinutes(rows: StatSessionRow[]): number {
  let sum = 0;
  for (const r of rows) sum += r.duration_min ?? 0;
  return sum;
}

/** 분 합계를 시/분으로 분리(표시용). */
export function splitHoursMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const safe = Math.max(0, Math.trunc(totalMinutes));
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

/**
 * 종목별 세션 수 분포. 전 종목 0으로 초기화 후 카운트 → 미훈련 종목도 0 키로 존재.
 * 한 세션이 2종목이면 각 종목 +1(분 배분 아님 — "종목 출현 합계").
 */
export function disciplineDistribution(rows: StatSessionRow[]): Record<Discipline, number> {
  const dist = Object.fromEntries(DISCIPLINES.map((d) => [d, 0])) as Record<Discipline, number>;
  for (const r of rows) {
    for (const d of r.disciplines) {
      if (d in dist) dist[d] += 1;
    }
  }
  return dist;
}

// ---------------------------------------------------------------------------
// 빈도(주/월) — 고정 N 윈도우, zero-fill, oldest→newest
// ---------------------------------------------------------------------------

/** 주어진 날짜가 속한 주의 시작(일요일) 'YYYY-MM-DD'. */
function weekStartISO(dateISO: string): string {
  const d = dayjs(dateISO);
  return d.subtract(d.day(), 'day').format(DATE_FMT); // day(): 0=일
}

/**
 * 최근 `weeks`주(오늘 포함 주까지)의 주간 세션 수. oldest→newest, 빈 주는 0.
 * 윈도우 밖 세션은 제외. 키 = 주 시작(일요일) 날짜 문자열.
 */
export function weeklyFrequency(
  rows: StatSessionRow[],
  today: string,
  weeks = 12,
): FrequencyBucket[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = weekStartISO(r.trained_on);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const thisWeekStart = dayjs(weekStartISO(today));
  const buckets: FrequencyBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = thisWeekStart.subtract(i * 7, 'day');
    const key = ws.format(DATE_FMT);
    buckets.push({ key, label: ws.format('M/D'), count: counts.get(key) ?? 0 });
  }
  return buckets;
}

/**
 * 최근 `months`개월(오늘 포함 월까지)의 월간 세션 수. oldest→newest, 빈 달은 0.
 * 키 = 'YYYY-MM'.
 */
export function monthlyFrequency(
  rows: StatSessionRow[],
  today: string,
  months = 12,
): FrequencyBucket[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = dayjs(r.trained_on).format('YYYY-MM');
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const thisMonth = dayjs(today).startOf('month');
  const buckets: FrequencyBucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const m = thisMonth.subtract(i, 'month');
    const key = m.format('YYYY-MM');
    buckets.push({ key, label: m.format('M월'), count: counts.get(key) ?? 0 });
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// 스트릭(연속 훈련일) — 오늘 유예
// ---------------------------------------------------------------------------

function trainedDateSet(rows: StatSessionRow[]): Set<string> {
  const set = new Set<string>();
  for (const r of rows) set.add(r.trained_on);
  return set;
}

/** anchor에서 하루씩 거슬러 연속 훈련일 수(문자열 비교 — DST 무관). */
function runEndingAt(anchorISO: string, set: Set<string>): number {
  let count = 0;
  let cur = dayjs(anchorISO);
  while (set.has(cur.format(DATE_FMT))) {
    count++;
    cur = cur.subtract(1, 'day');
  }
  return count;
}

/**
 * 현재/최장 연속 훈련일.
 * - current(오늘 유예): 오늘 기록 있으면 오늘 종료 연속, 없으면 어제 종료 연속(살아있음),
 *   둘 다 없으면 0. 오늘 미기록 시 +1 하지 않는다(어제까지 길이 그대로).
 * - longest: 전 기간 distinct 훈련일의 최장 연속.
 */
export function computeStreak(rows: StatSessionRow[], today: string): StreakResult {
  const set = trainedDateSet(rows);
  if (set.size === 0) return { current: 0, longest: 0 };

  const yesterday = dayjs(today).subtract(1, 'day').format(DATE_FMT);
  let current = 0;
  if (set.has(today)) current = runEndingAt(today, set);
  else if (set.has(yesterday)) current = runEndingAt(yesterday, set);

  const sorted = [...set].sort(); // 'YYYY-MM-DD' 사전순 == 시간순
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const expectedNext = dayjs(sorted[i - 1]).add(1, 'day').format(DATE_FMT);
    run = expectedNext === sorted[i] ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  return { current, longest };
}

/** 최근 `days`일(오늘 포함, oldest→newest)의 훈련 여부 점 행(스트릭 시각화). */
export function streakDays(rows: StatSessionRow[], today: string, days = 14): StreakDay[] {
  const set = trainedDateSet(rows);
  const base = dayjs(today);
  const out: StreakDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dateISO = base.subtract(i, 'day').format(DATE_FMT);
    out.push({ dateISO, trained: set.has(dateISO), isToday: i === 0 });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 최다 복습 기술
// ---------------------------------------------------------------------------

/**
 * technique_id별 세션 수(=복습 횟수). null 조인 행 제외, count 내림차순(동률 name 가나다),
 * 상위 `limit`개. UNIQUE(session_id, technique_id) 덕에 행 1개 = 세션 1건.
 */
export function countTopTechniques(rows: SessionTechniqueRow[], limit = 5): TopTechnique[] {
  const byId = new Map<string, TopTechnique>();
  for (const r of rows) {
    const t = r.techniques;
    if (!t) continue;
    const existing = byId.get(t.id);
    if (existing) existing.count += 1;
    else byId.set(t.id, { id: t.id, name: t.name, discipline: t.discipline, count: 1 });
  }
  return [...byId.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'))
    .slice(0, limit);
}

/**
 * 다룬 기술의 포지션별 출현 수 (F10 P2). position null인 기술(예: 일부 타격)은 제외.
 * count 내림차순. UNIQUE(session_id, technique_id) 덕에 행 1개 = 세션 1건.
 */
export function positionDistribution(rows: SessionTechniqueRow[]): PositionCount[] {
  const counts = new Map<PositionKind, number>();
  for (const r of rows) {
    const pos = r.techniques?.position;
    if (!pos) continue;
    counts.set(pos, (counts.get(pos) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([position, count]) => ({ position, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// 합성
// ---------------------------------------------------------------------------

/**
 * 합성 (F10 P2). 집계량(매트타임·세션수·종목분포)은 `filteredRows`(기간 필터 적용),
 * 시계열 지표(빈도·스트릭)는 `allRows`(전체) 기준. period='all'이면 둘이 동일.
 */
export function computeTrainingStats(
  filteredRows: StatSessionRow[],
  allRows: StatSessionRow[],
  today: string,
  opts: { weeks?: number; months?: number } = {},
): TrainingStats {
  return {
    totalMatMinutes: totalMatMinutes(filteredRows),
    sessionCount: filteredRows.length,
    disciplineDistribution: disciplineDistribution(filteredRows),
    weekly: weeklyFrequency(allRows, today, opts.weeks ?? 12),
    monthly: monthlyFrequency(allRows, today, opts.months ?? 12),
    streak: computeStreak(allRows, today),
  };
}
