import { describe, it, expect } from 'vitest';
import type { SessionWithDisciplines } from '@/entities/session';
import {
  buildWeekDays,
  groupSessionsByDateDesc,
  groupSessionsByDateMap,
  krDateHeader,
  weekRange,
} from './calendar-grouping';

function s(trained_on: string, id: string): SessionWithDisciplines {
  return { id, trained_on } as unknown as SessionWithDisciplines;
}

describe('weekRange (일요일 시작)', () => {
  it('수요일 → 전 일요일~토요일', () => {
    expect(weekRange(new Date('2026-06-03'))).toEqual({ startISO: '2026-05-31', endISO: '2026-06-06' });
  });
  it('일요일 → 자신이 시작', () => {
    expect(weekRange(new Date('2026-05-31'))).toEqual({ startISO: '2026-05-31', endISO: '2026-06-06' });
  });
  it('토요일 → 6일 전 일요일이 시작', () => {
    expect(weekRange(new Date('2026-06-06'))).toEqual({ startISO: '2026-05-31', endISO: '2026-06-06' });
  });
  it('월 경계(2026-04-01 수)', () => {
    expect(weekRange(new Date('2026-04-01'))).toEqual({ startISO: '2026-03-29', endISO: '2026-04-04' });
  });
  it('연 경계(2026-01-01 목) → start 2025-12-28', () => {
    expect(weekRange(new Date('2026-01-01'))).toEqual({ startISO: '2025-12-28', endISO: '2026-01-03' });
  });
});

describe('buildWeekDays', () => {
  it('7개, 일~토 순서, isToday는 주입한 today만', () => {
    const days = buildWeekDays('2026-05-31', '2026-06-03');
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.weekdayKR)).toEqual(['일', '월', '화', '수', '목', '금', '토']);
    expect(days[0]).toEqual({ dateISO: '2026-05-31', weekdayKR: '일', dayOfMonth: 31, isToday: false });
    expect(days[3]).toEqual({ dateISO: '2026-06-03', weekdayKR: '수', dayOfMonth: 3, isToday: true });
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
  });
});

describe('groupSessionsByDateMap', () => {
  it('trained_on 키로 버킷, 누락 날짜 부재', () => {
    const map = groupSessionsByDateMap([s('2026-06-01', 'a'), s('2026-06-03', 'b'), s('2026-06-03', 'c')]);
    expect(Object.keys(map).sort()).toEqual(['2026-06-01', '2026-06-03']);
    expect(map['2026-06-03'].map((x) => x.id)).toEqual(['b', 'c']);
    expect(map['2026-06-02']).toBeUndefined();
  });
});

describe('groupSessionsByDateDesc', () => {
  it('날짜 내림차순 + 그룹 내부 입력순 보존 + 입력 비변형', () => {
    const input = [s('2026-06-01', 'a'), s('2026-06-03', 'b'), s('2026-06-03', 'c'), s('2026-05-20', 'd')];
    const snapshot = input.map((x) => x.id);
    const groups = groupSessionsByDateDesc(input);
    expect(groups.map((g) => g.dateISO)).toEqual(['2026-06-03', '2026-06-01', '2026-05-20']);
    expect(groups[0].sessions.map((x) => x.id)).toEqual(['b', 'c']);
    expect(input.map((x) => x.id)).toEqual(snapshot); // 비변형
  });
  it('빈 입력 → []', () => {
    expect(groupSessionsByDateDesc([])).toEqual([]);
  });
});

describe('krDateHeader', () => {
  it("'2026-05-22' → '5월 22일 (금)'", () => {
    expect(krDateHeader('2026-05-22')).toBe('5월 22일 (금)');
  });
});
