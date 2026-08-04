/**
 * 영상 이어보기 — 재생 위치 로컬 저장 (F5 후속 / "볼 때마다 처음으로 돌아가 거슬린다").
 *
 * 위치는 기기 로컬(localStorage) 한 곳에 `{ key: {t,d,at} }` 맵으로 담는다. DB에 올리면 기기 간
 * 동기가 되지만 마이그레이션 + 재생마다 쓰기가 필요하고, "이어보기"는 그 기기에서 보던 자리라는
 * 성격이 강해 우선 로컬로 둔다(테마·온보딩 닫음과 같은 기기별 계열 — GymOnboardingCard 관용구).
 *
 * 키는 호출부가 namespace를 붙여 넘긴다([[uploadResumeKey]]) — 서명 URL은 10분마다 바뀌므로
 * 절대 URL을 키로 쓰면 안 된다. storage_path(`<user_id>/videos/<uuid>.<ext>`)는 불변이고
 * user_id가 앞에 붙어 한 기기를 여러 계정이 써도 위치가 섞이지 않는다.
 */

/** localStorage 키 — 영상별 항목을 따로 두면 정리가 번거로워 한 JSON 맵으로 관리한다. */
export const VIDEO_PROGRESS_STORAGE_KEY = 'matlog.video-progress';

/** 이보다 앞이면 이어볼 게 없다고 본다(초) — 잠깐 열었다 닫은 영상에 팝업을 띄우지 않는다. */
export const MIN_RESUME_SEC = 10;

/** 끝에서 이 안쪽이면 다 본 것으로 간주 → 기억하지 않는다(초). */
export const NEAR_END_SEC = 15;

/** 보관 상한 — 넘으면 오래된 것부터 버린다(localStorage 용량 폭주 방지). */
export const MAX_PROGRESS_ENTRIES = 100;

export interface PlaybackProgress {
  /** 저장된 재생 위치(초). */
  t: number;
  /** 영상 총 길이(초). 0 = 모름(metadata 로드 전 저장). */
  d: number;
  /** 저장 시각(epoch ms) — 상한 초과 시 오래된 항목부터 버리는 기준. */
  at: number;
}

/** 업로드 자산(kind='upload')의 이어보기 키. 서명 URL이 아닌 불변 storage_path 기준. */
export function uploadResumeKey(storagePath: string): string {
  return `upload:${storagePath}`;
}

/**
 * 기억할 가치가 있는 위치인가 — 너무 앞(MIN 미만)이거나 사실상 끝(NEAR_END 안쪽)이면 false.
 * duration을 모르면(0/NaN, metadata 전) 끝 판정은 생략하고 앞 기준만 본다.
 */
export function isResumablePosition(t: number, d: number): boolean {
  if (!Number.isFinite(t) || t < MIN_RESUME_SEC) return false;
  if (!Number.isFinite(d) || d <= 0) return true;
  return t <= d - NEAR_END_SEC;
}

/** 저장된 맵 전체. 파싱 실패/비가용(시크릿·WebView 제약)이면 빈 맵 — 이어보기는 없어도 되는 기능. */
function readAll(): Record<string, PlaybackProgress> {
  try {
    const raw = window.localStorage.getItem(VIDEO_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, PlaybackProgress> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      // 남이 쓴 키/구버전 형식이 섞여도 무너지지 않게 항목 단위로 검증하고 흘려보낸다.
      if (!value || typeof value !== 'object') continue;
      const { t, d, at } = value as Partial<PlaybackProgress>;
      if (typeof t !== 'number' || !Number.isFinite(t) || t < 0) continue;
      out[key] = {
        t,
        d: typeof d === 'number' && Number.isFinite(d) && d > 0 ? d : 0,
        at: typeof at === 'number' && Number.isFinite(at) ? at : 0,
      };
    }
    return out;
  } catch {
    return {};
  }
}

/** 맵 저장 — 상한 초과분(오래된 at 순)은 버린다. 쓰기 실패(용량·비가용)는 무시. */
function writeAll(map: Record<string, PlaybackProgress>): void {
  try {
    let next = map;
    const keys = Object.keys(map);
    if (keys.length > MAX_PROGRESS_ENTRIES) {
      const keep = keys
        .sort((a, b) => map[b].at - map[a].at)
        .slice(0, MAX_PROGRESS_ENTRIES);
      next = Object.fromEntries(keep.map((k) => [k, map[k]]));
    }
    window.localStorage.setItem(VIDEO_PROGRESS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장 실패 → 이어보기만 안 될 뿐 재생엔 영향 없음.
  }
}

/** 이어볼 위치(없거나 기억할 가치가 없으면 null). */
export function readPlaybackProgress(key: string): PlaybackProgress | null {
  const entry = readAll()[key];
  if (!entry) return null;
  return isResumablePosition(entry.t, entry.d) ? entry : null;
}

/**
 * 위치 저장. 두 경우는 저장하지 않는다:
 *  - 너무 앞(MIN 미만) → **덮어쓰지 않고 무시**. 서명 URL 재발급으로 <video>가 0초부터 리로드될 때
 *    timeupdate(t≈0)가 기존 위치를 지워버리는 사고를 막는다.
 *  - 사실상 끝(NEAR_END 안쪽) → 다 본 것이므로 항목을 지운다(다음 재생은 처음부터, 팝업 없음).
 */
export function savePlaybackProgress(key: string, t: number, d: number): void {
  if (!Number.isFinite(t) || t < MIN_RESUME_SEC) return;
  if (!isResumablePosition(t, d)) {
    clearPlaybackProgress(key);
    return;
  }
  const map = readAll();
  map[key] = { t, d: Number.isFinite(d) && d > 0 ? d : 0, at: Date.now() };
  writeAll(map);
}

/** 위치 삭제 — "처음부터" 선택 / 끝까지 재생(ended) 시. */
export function clearPlaybackProgress(key: string): void {
  const map = readAll();
  if (!(key in map)) return;
  delete map[key];
  writeAll(map);
}
