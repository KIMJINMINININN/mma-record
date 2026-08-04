// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import {
  clearPlaybackProgress,
  isResumablePosition,
  MAX_PROGRESS_ENTRIES,
  MIN_RESUME_SEC,
  NEAR_END_SEC,
  readPlaybackProgress,
  savePlaybackProgress,
  uploadResumeKey,
  VIDEO_PROGRESS_STORAGE_KEY,
} from '@/entities/media/model/playback-progress';

const KEY = uploadResumeKey('user-1/videos/abc.mp4');

beforeEach(() => localStorage.clear());

describe('uploadResumeKey', () => {
  it('namespaces the storage path (서명 URL 아님)', () => {
    expect(uploadResumeKey('u/videos/a.mp4')).toBe('upload:u/videos/a.mp4');
  });
});

describe('isResumablePosition', () => {
  it('MIN 미만은 이어볼 위치가 아니다', () => {
    expect(isResumablePosition(MIN_RESUME_SEC - 1, 300)).toBe(false);
    expect(isResumablePosition(0, 300)).toBe(false);
  });

  it('중간 위치는 이어볼 위치다', () => {
    expect(isResumablePosition(120, 300)).toBe(true);
  });

  it('끝에서 NEAR_END 안쪽은 다 본 것으로 본다', () => {
    expect(isResumablePosition(300 - NEAR_END_SEC + 1, 300)).toBe(false);
    expect(isResumablePosition(300 - NEAR_END_SEC, 300)).toBe(true);
  });

  it('duration 모름(0/NaN)이면 앞 기준만 본다', () => {
    expect(isResumablePosition(60, 0)).toBe(true);
    expect(isResumablePosition(60, Number.NaN)).toBe(true);
    expect(isResumablePosition(3, 0)).toBe(false);
  });

  it('비유한 위치는 거부', () => {
    expect(isResumablePosition(Number.NaN, 300)).toBe(false);
    expect(isResumablePosition(Number.POSITIVE_INFINITY, 300)).toBe(false);
  });
});

describe('savePlaybackProgress / readPlaybackProgress', () => {
  it('저장한 위치를 그대로 읽는다', () => {
    savePlaybackProgress(KEY, 123.5, 300);
    expect(readPlaybackProgress(KEY)?.t).toBe(123.5);
    expect(readPlaybackProgress(KEY)?.d).toBe(300);
  });

  it('저장 없으면 null', () => {
    expect(readPlaybackProgress(KEY)).toBeNull();
  });

  it('MIN 미만 저장은 기존 위치를 덮지 않는다(서명 URL 재발급 t≈0 방어)', () => {
    savePlaybackProgress(KEY, 123, 300);
    savePlaybackProgress(KEY, 0, 300);
    savePlaybackProgress(KEY, 2, 300);
    expect(readPlaybackProgress(KEY)?.t).toBe(123);
  });

  it('끝 근처 저장은 항목을 지운다(다 본 것)', () => {
    savePlaybackProgress(KEY, 123, 300);
    savePlaybackProgress(KEY, 295, 300);
    expect(readPlaybackProgress(KEY)).toBeNull();
  });

  it('duration 모름이면 d=0으로 저장', () => {
    savePlaybackProgress(KEY, 60, Number.NaN);
    expect(readPlaybackProgress(KEY)?.d).toBe(0);
  });

  it('키가 다른 영상은 서로 섞이지 않는다', () => {
    savePlaybackProgress(KEY, 60, 300);
    savePlaybackProgress(uploadResumeKey('user-1/videos/other.mp4'), 200, 300);
    expect(readPlaybackProgress(KEY)?.t).toBe(60);
  });

  it('clear 하면 사라진다', () => {
    savePlaybackProgress(KEY, 60, 300);
    clearPlaybackProgress(KEY);
    expect(readPlaybackProgress(KEY)).toBeNull();
  });

  it('없는 키 clear는 무해(빈 쓰기 없음)', () => {
    clearPlaybackProgress(KEY);
    expect(localStorage.getItem(VIDEO_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('상한을 넘으면 오래된 항목부터 버린다', () => {
    // at(저장 시각)이 겹치지 않게 직접 심는다 — Date.now()는 같은 tick에 동일값.
    const seeded: Record<string, { t: number; d: number; at: number }> = {};
    for (let i = 0; i < MAX_PROGRESS_ENTRIES; i += 1) {
      seeded[`upload:old-${i}.mp4`] = { t: 60, d: 300, at: i + 1 };
    }
    localStorage.setItem(VIDEO_PROGRESS_STORAGE_KEY, JSON.stringify(seeded));

    savePlaybackProgress(KEY, 60, 300); // at = Date.now() → 가장 최신

    const stored = JSON.parse(localStorage.getItem(VIDEO_PROGRESS_STORAGE_KEY) as string);
    expect(Object.keys(stored)).toHaveLength(MAX_PROGRESS_ENTRIES);
    expect(stored[KEY]).toBeDefined();
    expect(stored['upload:old-0.mp4']).toBeUndefined(); // at=1 (가장 오래됨)
    expect(stored['upload:old-99.mp4']).toBeDefined();
  });

  it('깨진 JSON / 이상한 항목은 무시하고 계속 동작한다', () => {
    localStorage.setItem(VIDEO_PROGRESS_STORAGE_KEY, 'not json{');
    expect(readPlaybackProgress(KEY)).toBeNull();

    savePlaybackProgress(KEY, 60, 300);
    expect(readPlaybackProgress(KEY)?.t).toBe(60);

    localStorage.setItem(
      VIDEO_PROGRESS_STORAGE_KEY,
      JSON.stringify({ [KEY]: { t: 'x' }, 'upload:ok.mp4': { t: 60 } }),
    );
    expect(readPlaybackProgress(KEY)).toBeNull();
    // t만 있는 구형 항목도 살려 읽는다(d/at 결측 → 0).
    expect(readPlaybackProgress('upload:ok.mp4')).toEqual({ t: 60, d: 0, at: 0 });
  });
});
