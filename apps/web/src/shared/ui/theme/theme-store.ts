'use client';

import { create } from 'zustand';

/**
 * 테마 스토어 (Design §2.8 — P0 토글 + OS 자동).
 *
 * UI 상태(서버 데이터 아님) → zustand로 보관(Develop §6b).
 * - 값: 'system'(OS 따름) | 'light' | 'dark'.
 * - localStorage 키 `mma-theme`에 영속(ThemeScript와 동일 키 — FOUC 방지 정합).
 * - 적용 규칙은 tailwind-theme.css의 `@custom-variant dark`와 정확히 일치해야 한다:
 *   · 'light' | 'dark' → `document.documentElement.dataset.theme = value`
 *   · 'system'        → `data-theme` 제거 → CSS `prefers-color-scheme` 분기가 적용됨.
 */

export type ThemeMode = 'system' | 'light' | 'dark';

/** ThemeScript(인라인)와 공유되는 단일 출처 상수 — 변경 시 themeScript도 동기화. */
export const THEME_STORAGE_KEY = 'mma-theme';

/** 저장값을 ThemeMode로 안전 파싱(미지정/이상값 → 'system'). */
function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

/**
 * `<html data-theme>`에 테마를 반영 — `@custom-variant dark`와 1:1 일치.
 * 'system'이면 속성을 제거해 OS 선호(prefers-color-scheme)에 위임한다.
 */
function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') {
    root.dataset.theme = theme;
  } else {
    delete root.dataset.theme;
  }
}

interface ThemeState {
  theme: ThemeMode;
  /** 마운트 시 localStorage 값으로 스토어를 동기화(서버 기본값과 보정). */
  hydrate: () => void;
  setTheme: (theme: ThemeMode) => void;
  /** system → light → dark → system 순환(테마 토글 버튼용). */
  cycleTheme: () => void;
}

const NEXT_THEME: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  // SSR/초기 렌더의 결정적 기본값. 실제 값은 hydrate()가 보정(인라인 스크립트가 paint 전 DOM은 이미 맞춰둠).
  theme: 'system',

  hydrate: () => {
    const stored = readStoredTheme();
    set({ theme: stored });
    // DOM은 인라인 스크립트가 이미 적용했지만, hydrate에서도 한 번 보정해 일관성 유지.
    applyTheme(stored);
  },

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      if (theme === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    applyTheme(theme);
    set({ theme });
  },

  cycleTheme: () => {
    get().setTheme(NEXT_THEME[get().theme]);
  },
}));
