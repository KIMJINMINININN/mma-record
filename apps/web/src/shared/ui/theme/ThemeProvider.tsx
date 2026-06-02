'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useThemeStore, type ThemeMode } from './theme-store';

/**
 * ThemeProvider — 마운트 시 localStorage 값으로 테마 스토어를 hydrate.
 *
 * 실제 DOM 적용(FOUC 방지)은 `<ThemeScript/>`가 paint 전에 이미 처리한다.
 * 여기서는 React 상태를 그 값과 맞춰, 토글 UI가 올바른 현재값을 표시하게 한다.
 * (Design §2.8) 부수효과뿐이라 children을 그대로 통과시킨다.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const hydrate = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <>{children}</>;
}

/**
 * useTheme — 현재 테마 모드와 변경 액션 훅.
 * @returns theme(현재값) · setTheme · cycleTheme(system→light→dark 순환)
 */
export function useTheme(): {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
} {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const cycleTheme = useThemeStore((s) => s.cycleTheme);
  return { theme, setTheme, cycleTheme };
}
