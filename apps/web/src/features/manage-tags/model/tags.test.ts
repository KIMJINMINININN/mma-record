import { describe, it, expect } from 'vitest';
import type { Tag } from '@/entities/tag';
import { mergeTagCounts, sortTags, type TagWithCount } from './tags';

function tag(id: string, name: string, color: string | null = null): Tag {
  return { id, user_id: 'u', name, color, created_at: '2026-01-01T00:00:00.000Z' };
}

describe('mergeTagCounts', () => {
  it('맵에 있으면 그 수, 없으면 0', () => {
    const counts = new Map([['a', 3]]);
    const merged = mergeTagCounts([tag('a', '가'), tag('b', '나')], counts);
    expect(merged.find((t) => t.id === 'a')?.count).toBe(3);
    expect(merged.find((t) => t.id === 'b')?.count).toBe(0);
  });
  it('빈 입력 → []', () => expect(mergeTagCounts([], new Map())).toEqual([]));
  it('입력 비변형(새 객체)', () => {
    const input = [tag('a', '가')];
    const merged = mergeTagCounts(input, new Map());
    expect(merged[0]).not.toBe(input[0]);
    expect((input[0] as TagWithCount).count).toBeUndefined();
  });
});

describe('sortTags', () => {
  const rows: TagWithCount[] = [
    { ...tag('a', '나'), count: 1 },
    { ...tag('b', '가'), count: 5 },
    { ...tag('c', '다'), count: 5 },
  ];

  it('frequency: 횟수 desc, 동률 이름 가나다', () => {
    const sorted = sortTags(rows, 'frequency');
    expect(sorted.map((t) => t.name)).toEqual(['가', '다', '나']); // 5(가),5(다),1(나)
  });

  it('name: 가나다(횟수 무시)', () => {
    expect(sortTags(rows, 'name').map((t) => t.name)).toEqual(['가', '나', '다']);
  });

  it('입력 비변형(새 배열)', () => {
    const sorted = sortTags(rows, 'name');
    expect(sorted).not.toBe(rows);
    expect(rows.map((t) => t.name)).toEqual(['나', '가', '다']);
  });
});
