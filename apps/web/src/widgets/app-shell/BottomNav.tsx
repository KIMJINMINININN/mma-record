'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from 'class-variance-authority';
import { NAV_ITEMS, isNavItemActive } from './nav-items';

/**
 * BottomNav — 모바일 하단 탭 바 (Design §10.2 / §10.3 / PRD §7).
 *
 * `md` 미만에서만 표시(데스크톱은 SideNav). `fixed bottom-0`로 고정,
 * safe-area(홈 인디케이터)를 `env(safe-area-inset-bottom)`로 흡수(§10.3).
 * 각 탭은 44px 이상 hit-area(§10.1 터치 타깃). 활성 = `--primary` 강조.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주 메뉴"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--surface-base)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex min-h-12 flex-col items-center justify-center gap-0.5 py-1.5 text-button-xxs outline-none',
                  'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
                  'focus-visible:shadow-[var(--ring-focus)]',
                  active ? 'text-[var(--primary)] font-medium' : 'text-[var(--text-muted)]',
                )}
              >
                <Icon width={22} height={22} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
