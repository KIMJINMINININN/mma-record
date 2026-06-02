'use client';

import { IconButton, SystemThemeIcon, SunIcon, MoonIcon } from '@/shared/ui';
import { useTheme, type ThemeMode } from '@/shared/ui/theme';

/**
 * ThemeToggle — system → light → dark 순환 토글 (Design §7a / §2.8).
 *
 * 현재 모드를 아이콘으로 반영(시스템=모니터 / 라이트=해 / 다크=달).
 * hydration 안전성: 스토어 기본값이 서버·첫 클라이언트 렌더 모두 'system'으로 동일하고
 * (ThemeProvider의 hydrate가 hydration 완료 후 실제값으로 갱신) → mount 플래그 불필요.
 * paint 전 실제 테마는 ThemeScript가 이미 DOM에 적용하므로 깜빡임 없음.
 */

const MODE_META: Record<ThemeMode, { Icon: typeof SunIcon; label: string }> = {
  system: { Icon: SystemThemeIcon, label: '테마: 시스템' },
  light: { Icon: SunIcon, label: '테마: 라이트' },
  dark: { Icon: MoonIcon, label: '테마: 다크' },
};

export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();
  const { Icon, label } = MODE_META[theme];

  return (
    <IconButton
      aria-label={`${label} (눌러서 전환)`}
      title={label}
      onClick={cycleTheme}
    >
      <Icon width={20} height={20} />
    </IconButton>
  );
}
