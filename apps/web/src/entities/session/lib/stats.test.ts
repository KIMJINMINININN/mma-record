import { describe, it, expect } from 'vitest';
import { DISCIPLINES, type Discipline, type PositionKind } from '@/shared/model/enums';
import {
  countTopTechniques,
  computeStreak,
  computeTrainingStats,
  disciplineDistribution,
  filterByPeriod,
  monthlyFrequency,
  periodStartISO,
  positionDistribution,
  splitHoursMinutes,
  streakDays,
  totalMatMinutes,
  weeklyFrequency,
  type SessionTechniqueRow,
  type StatSessionRow,
} from './stats';

// 2026-06-03 = 수요일(day()=3) → 주 시작(일요일) 2026-05-31.
const TODAY = '2026-06-03';

function row(
  trained_on: string,
  duration_min: number | null = null,
  disciplines: Discipline[] = [],
): StatSessionRow {
  return { trained_on, duration_min, disciplines };
}

// ---------------------------------------------------------------------------
// totalMatMinutes / splitHoursMinutes
// ---------------------------------------------------------------------------

describe('totalMatMinutes', () => {
  it('empty → 0', () => expect(totalMatMinutes([])).toBe(0));
  it('[60] → 60', () => expect(totalMatMinutes([row('2026-06-03', 60)])).toBe(60));
  it('null 은 0으로: [60, null, 30] → 90', () => {
    expect(totalMatMinutes([row('2026-06-01', 60), row('2026-06-02', null), row('2026-06-03', 30)])).toBe(90);
  });
  it('all-null → 0', () => {
    expect(totalMatMinutes([row('2026-06-01', null), row('2026-06-02', null)])).toBe(0);
  });
  it('[90, 45, 0] → 135', () => {
    expect(totalMatMinutes([row('a', 90), row('b', 45), row('c', 0)])).toBe(135);
  });
});

describe('splitHoursMinutes', () => {
  it('0 → 0h 0m', () => expect(splitHoursMinutes(0)).toEqual({ hours: 0, minutes: 0 }));
  it('59 → 0h 59m', () => expect(splitHoursMinutes(59)).toEqual({ hours: 0, minutes: 59 }));
  it('90 → 1h 30m', () => expect(splitHoursMinutes(90)).toEqual({ hours: 1, minutes: 30 }));
  it('125 → 2h 5m', () => expect(splitHoursMinutes(125)).toEqual({ hours: 2, minutes: 5 }));
  it('음수 → 0h 0m', () => expect(splitHoursMinutes(-10)).toEqual({ hours: 0, minutes: 0 }));
});

// ---------------------------------------------------------------------------
// disciplineDistribution
// ---------------------------------------------------------------------------

describe('disciplineDistribution', () => {
  it('전 종목 키 존재(enum-exhaustive) — 빈 입력은 전부 0', () => {
    const dist = disciplineDistribution([]);
    expect(Object.keys(dist)).toHaveLength(DISCIPLINES.length);
    for (const d of DISCIPLINES) expect(dist[d]).toBe(0);
  });

  it('2종목 세션은 양쪽 +1', () => {
    const dist = disciplineDistribution([row('2026-06-03', 60, ['bjj_gi', 'mma'])]);
    expect(dist.bjj_gi).toBe(1);
    expect(dist.mma).toBe(1);
    expect(dist.bjj_nogi).toBe(0);
    expect(dist.wrestling).toBe(0);
    expect(dist.striking).toBe(0);
  });

  it('같은 종목 누적', () => {
    const dist = disciplineDistribution([
      row('a', null, ['bjj_nogi']),
      row('b', null, ['bjj_nogi']),
      row('c', null, ['bjj_nogi']),
    ]);
    expect(dist.bjj_nogi).toBe(3);
    expect(dist.bjj_gi).toBe(0);
  });

  it('빈 disciplines[] 세션은 기여 없음', () => {
    const dist = disciplineDistribution([row('a', 60, [])]);
    for (const d of DISCIPLINES) expect(dist[d]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// weeklyFrequency (일요일 시작)
// ---------------------------------------------------------------------------

describe('weeklyFrequency', () => {
  it('빈 입력 weeks=12 → length 12, 전부 0', () => {
    const b = weeklyFrequency([], TODAY, 12);
    expect(b).toHaveLength(12);
    expect(b.every((x) => x.count === 0)).toBe(true);
  });

  it('마지막 버킷 = 이번 주(일요일 2026-05-31), oldest→newest', () => {
    const b = weeklyFrequency([], TODAY, 12);
    expect(b[11].key).toBe('2026-05-31');
    expect(b[0].key).toBe('2026-03-15'); // 11주 전
  });

  it('오늘 세션 → 마지막(이번 주) 버킷 +1', () => {
    const b = weeklyFrequency([row(TODAY)], TODAY, 12);
    expect(b[11].count).toBe(1);
    expect(b.reduce((s, x) => s + x.count, 0)).toBe(1);
  });

  it('같은 주 2세션 → 한 버킷에 2', () => {
    const b = weeklyFrequency([row('2026-06-01'), row('2026-06-03')], TODAY, 12);
    expect(b[11].count).toBe(2);
  });

  it('이전 주 세션 → 직전 버킷', () => {
    const b = weeklyFrequency([row('2026-05-28')], TODAY, 12); // 주 시작 2026-05-24
    expect(b[10].key).toBe('2026-05-24');
    expect(b[10].count).toBe(1);
  });

  it('윈도우 밖 세션 제외', () => {
    const b = weeklyFrequency([row(TODAY), row('2026-01-01')], TODAY, 12);
    expect(b.reduce((s, x) => s + x.count, 0)).toBe(1);
  });

  it('연말 경계: 2025-12-31 & 2026-01-01 은 같은 주(2025-12-28)로 집계', () => {
    const b = weeklyFrequency([row('2025-12-31'), row('2026-01-01')], '2026-01-10', 12);
    const wk = b.find((x) => x.key === '2025-12-28');
    expect(wk?.count).toBe(2);
    expect(b.reduce((s, x) => s + x.count, 0)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// monthlyFrequency
// ---------------------------------------------------------------------------

describe('monthlyFrequency', () => {
  it('빈 입력 months=12 → length 12, 전부 0, 마지막 2026-06', () => {
    const b = monthlyFrequency([], TODAY, 12);
    expect(b).toHaveLength(12);
    expect(b.every((x) => x.count === 0)).toBe(true);
    expect(b[11].key).toBe('2026-06');
    expect(b[0].key).toBe('2025-07');
  });

  it('같은 달 2세션 → 한 버킷에 2', () => {
    const b = monthlyFrequency([row('2026-06-01'), row('2026-06-30')], TODAY, 12);
    expect(b[11].count).toBe(2);
  });

  it('연말 경계: 2025-12 / 2026-01 인접 버킷', () => {
    const b = monthlyFrequency([row('2025-12-31'), row('2026-01-01')], '2026-01-10', 12);
    expect(b[11].key).toBe('2026-01');
    expect(b[11].count).toBe(1);
    expect(b[10].key).toBe('2025-12');
    expect(b[10].count).toBe(1);
  });

  it('12개월 밖 제외', () => {
    const b = monthlyFrequency([row('2024-01-01'), row(TODAY)], TODAY, 12);
    expect(b.reduce((s, x) => s + x.count, 0)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computeStreak (오늘 유예)
// ---------------------------------------------------------------------------

describe('computeStreak', () => {
  it('빈 → {0,0}', () => expect(computeStreak([], TODAY)).toEqual({ current: 0, longest: 0 }));

  it('오늘 1세션 → {1,1}', () => {
    expect(computeStreak([row(TODAY)], TODAY)).toEqual({ current: 1, longest: 1 });
  });

  it('어제만(오늘 유예) → current 살아있음 {1,1}', () => {
    expect(computeStreak([row('2026-06-02')], TODAY)).toEqual({ current: 1, longest: 1 });
  });

  it('이틀 전만 → 끊김 {0,1}', () => {
    expect(computeStreak([row('2026-06-01')], TODAY)).toEqual({ current: 0, longest: 1 });
  });

  it('오늘 종료 3연속 → {3,3}', () => {
    expect(computeStreak([row('2026-06-01'), row('2026-06-02'), row('2026-06-03')], TODAY)).toEqual({
      current: 3,
      longest: 3,
    });
  });

  it('어제 종료 3연속 + 오늘 빈(유예) → {3,3}, +1 안 함', () => {
    expect(computeStreak([row('2026-05-31'), row('2026-06-01'), row('2026-06-02')], TODAY)).toEqual({
      current: 3,
      longest: 3,
    });
  });

  it('과거 3연속 + 오늘 단독 → current 1, longest 3', () => {
    const rows = [row('2026-05-01'), row('2026-05-02'), row('2026-05-03'), row(TODAY)];
    expect(computeStreak(rows, TODAY)).toEqual({ current: 1, longest: 3 });
  });

  it('과거 5연속 + 갭 + 오늘 2연속 → {2,5}', () => {
    const rows = [
      row('2026-04-01'), row('2026-04-02'), row('2026-04-03'), row('2026-04-04'), row('2026-04-05'),
      row('2026-06-02'), row('2026-06-03'),
    ];
    expect(computeStreak(rows, TODAY)).toEqual({ current: 2, longest: 5 });
  });

  it('같은 날 3세션 dedupe → {1,1}', () => {
    expect(computeStreak([row(TODAY), row(TODAY), row(TODAY)], TODAY)).toEqual({ current: 1, longest: 1 });
  });

  it('비정렬 입력도 정상', () => {
    const rows = [row('2026-06-03'), row('2026-06-01'), row('2026-06-02')];
    expect(computeStreak(rows, TODAY)).toEqual({ current: 3, longest: 3 });
  });

  it('월/윤 경계: 2026-02-28 → 2026-03-01 연속', () => {
    expect(computeStreak([row('2026-02-28'), row('2026-03-01')], '2026-03-01')).toEqual({
      current: 2,
      longest: 2,
    });
  });
});

// ---------------------------------------------------------------------------
// streakDays
// ---------------------------------------------------------------------------

describe('streakDays', () => {
  it('length === days, 마지막은 오늘', () => {
    const d = streakDays([], TODAY, 14);
    expect(d).toHaveLength(14);
    expect(d[13]).toEqual({ dateISO: TODAY, trained: false, isToday: true });
    expect(d[0].dateISO).toBe('2026-05-21'); // 13일 전
    expect(d[0].isToday).toBe(false);
  });

  it('trained 플래그 정확', () => {
    const d = streakDays([row(TODAY), row('2026-06-01')], TODAY, 14);
    expect(d.find((x) => x.dateISO === TODAY)?.trained).toBe(true);
    expect(d.find((x) => x.dateISO === '2026-06-01')?.trained).toBe(true);
    expect(d.find((x) => x.dateISO === '2026-06-02')?.trained).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// countTopTechniques
// ---------------------------------------------------------------------------

function tRow(
  id: string,
  name: string,
  discipline: Discipline = 'bjj_gi',
  position: PositionKind | null = null,
  trained_on = '2026-06-03',
): SessionTechniqueRow {
  return { technique_id: id, trained_on, techniques: { id, name, discipline, position } };
}

describe('countTopTechniques', () => {
  it('null 조인 행 제외', () => {
    const rows: SessionTechniqueRow[] = [
      tRow('a', '암바'),
      { technique_id: 'x', trained_on: '2026-06-03', techniques: null },
    ];
    const top = countTopTechniques(rows, 5);
    expect(top).toHaveLength(1);
    expect(top[0].id).toBe('a');
  });

  it('count 내림차순', () => {
    const rows = [tRow('a', '암바'), tRow('a', '암바'), tRow('a', '암바'), tRow('b', '트라이앵글')];
    const top = countTopTechniques(rows, 5);
    expect(top[0]).toEqual({ id: 'a', name: '암바', discipline: 'bjj_gi', count: 3 });
    expect(top[1].id).toBe('b');
  });

  it('동률은 name 가나다순', () => {
    const rows = [tRow('a', '나'), tRow('a', '나'), tRow('b', '가'), tRow('b', '가')];
    const top = countTopTechniques(rows, 5);
    expect(top.map((t) => t.name)).toEqual(['가', '나']);
  });

  it('limit 슬라이스', () => {
    const rows = [tRow('a', 'A'), tRow('b', 'B'), tRow('c', 'C')];
    expect(countTopTechniques(rows, 2)).toHaveLength(2);
  });

  it('빈 입력 → []', () => expect(countTopTechniques([], 5)).toEqual([]));
});

// ---------------------------------------------------------------------------
// computeTrainingStats
// ---------------------------------------------------------------------------

describe('computeTrainingStats', () => {
  it('전 키 존재 + 분포 exhaustive + 빈도 length 12', () => {
    const rows = [row('2026-06-03', 60, ['bjj_gi']), row('2026-06-02', 30, ['mma'])];
    const s = computeTrainingStats(rows, rows, TODAY);
    expect(s.totalMatMinutes).toBe(90);
    expect(s.sessionCount).toBe(2);
    expect(Object.keys(s.disciplineDistribution)).toHaveLength(DISCIPLINES.length);
    expect(s.weekly).toHaveLength(12);
    expect(s.monthly).toHaveLength(12);
    expect(s.streak).toEqual({ current: 2, longest: 2 });
  });

  it('opts.weeks/months 오버라이드', () => {
    const s = computeTrainingStats([], [], TODAY, { weeks: 4, months: 6 });
    expect(s.weekly).toHaveLength(4);
    expect(s.monthly).toHaveLength(6);
  });

  it('집계량은 filtered, 빈도/스트릭은 all 기준(F10 P2)', () => {
    // filtered=오늘 1건만, all=오늘+과거연속 → 매트타임/세션수는 filtered, 스트릭은 all
    const filtered = [row(TODAY, 60, ['bjj_gi'])];
    const all = [row('2026-06-01', 30, ['mma']), row('2026-06-02', 30, ['mma']), row(TODAY, 60, ['bjj_gi'])];
    const s = computeTrainingStats(filtered, all, TODAY);
    expect(s.totalMatMinutes).toBe(60); // filtered만
    expect(s.sessionCount).toBe(1); // filtered만
    expect(s.streak).toEqual({ current: 3, longest: 3 }); // all 기준
    expect(s.weekly.reduce((sum, b) => sum + b.count, 0)).toBe(3); // all 기준
  });
});

// ---------------------------------------------------------------------------
// filterByPeriod / periodStartISO (F10 P2)
// ---------------------------------------------------------------------------

describe('periodStartISO', () => {
  it("'all' → null(필터 없음)", () => expect(periodStartISO(TODAY, 'all')).toBeNull());
  it("'1m' → 2026-05-03", () => expect(periodStartISO(TODAY, '1m')).toBe('2026-05-03'));
  it("'3m' → 2026-03-03", () => expect(periodStartISO(TODAY, '3m')).toBe('2026-03-03'));
  it("'6m' → 2025-12-03", () => expect(periodStartISO(TODAY, '6m')).toBe('2025-12-03'));
});

describe('filterByPeriod', () => {
  it("'all' → 전체 반환", () => {
    const rows = [row('2020-01-01'), row(TODAY)];
    expect(filterByPeriod(rows, TODAY, 'all')).toHaveLength(2);
  });

  it("'1m' → 경계(2026-05-03) 포함, 이전 제외", () => {
    const rows = [row('2026-05-02'), row('2026-05-03'), row(TODAY)];
    const out = filterByPeriod(rows, TODAY, '1m');
    expect(out.map((r) => r.trained_on)).toEqual(['2026-05-03', '2026-06-03']);
  });

  it('SessionTechniqueRow 에도 동작(제네릭 trained_on)', () => {
    const rows = [
      tRow('a', '암바', 'bjj_gi', 'mount', '2026-01-01'),
      tRow('b', '킥', 'striking', null, TODAY),
    ];
    const out = filterByPeriod(rows, TODAY, '1m');
    expect(out).toHaveLength(1);
    expect(out[0].technique_id).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// positionDistribution (F10 P2)
// ---------------------------------------------------------------------------

describe('positionDistribution', () => {
  it('빈 입력 → []', () => expect(positionDistribution([])).toEqual([]));

  it('position null 기술 제외', () => {
    const rows = [tRow('a', '킥', 'striking', null), tRow('b', '암바', 'bjj_gi', 'mount')];
    expect(positionDistribution(rows)).toEqual([{ position: 'mount', count: 1 }]);
  });

  it('포지션별 카운트 + count 내림차순', () => {
    const rows = [
      tRow('a', 'A', 'bjj_gi', 'mount'),
      tRow('b', 'B', 'bjj_gi', 'mount'),
      tRow('c', 'C', 'bjj_gi', 'closed_guard'),
    ];
    expect(positionDistribution(rows)).toEqual([
      { position: 'mount', count: 2 },
      { position: 'closed_guard', count: 1 },
    ]);
  });

  it('null 조인 행 제외', () => {
    const rows: SessionTechniqueRow[] = [
      { technique_id: 'x', trained_on: TODAY, techniques: null },
      tRow('a', '암바', 'bjj_gi', 'mount'),
    ];
    expect(positionDistribution(rows)).toEqual([{ position: 'mount', count: 1 }]);
  });
});
