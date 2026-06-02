import type { ComponentType, SVGProps } from 'react';
import { CalendarIcon, TechniqueIcon, SearchIcon, ProfileIcon } from '@/shared/ui';

/**
 * 내비게이션 단일 출처 (PRD §7 IA — 캘린더 · 기술 · 검색 · 프로필).
 * SideNav(데스크톱)와 BottomNav(모바일)가 같은 배열을 공유해 패리티를 보장한다.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/calendar', label: '캘린더', icon: CalendarIcon },
  { href: '/techniques', label: '기술', icon: TechniqueIcon },
  { href: '/search', label: '검색', icon: SearchIcon },
  { href: '/profile', label: '프로필', icon: ProfileIcon },
] as const;

/**
 * 현재 경로가 해당 nav 항목에 속하는지(prefix 매칭).
 * 예: `/techniques/abc` → '기술' 활성. 정확 일치 + 하위 경로(`/href/...`)만 인정해
 * `/searchx` 같은 우연한 prefix 오탐을 막는다.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
