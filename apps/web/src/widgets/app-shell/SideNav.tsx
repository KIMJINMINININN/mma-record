'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from 'class-variance-authority';
import { NAV_ITEMS, isNavItemActive } from './nav-items';

/**
 * SideNav — 데스크톱 좌측 사이드 내비 (Design §10.2 / PRD §7).
 *
 * `md` 이상에서만 표시(모바일은 BottomNav). NAV_ITEMS 단일 출처 공유.
 * 활성 항목 = `--primary`(빨강) 강조 + `aria-current="page"`.
 * 캘린더가 가로 폭을 최대 확보하도록 사이드바는 고정 폭(w-60).
 */
export function SideNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주 메뉴"
      className="hidden w-60 shrink-0 flex-col gap-1 border-r border-[var(--border-subtle)] bg-[var(--surface-base)] p-3 md:flex"
    >
      {/* 워드마크(브랜드명 미정 T12 — 중립 타이틀) */}
      <Link
        href="/calendar"
        className="mb-2 flex items-center gap-2 rounded-xs px-2 py-2 outline-none focus-visible:shadow-[var(--ring-focus)]"
      >
        <span className="inline-flex size-7 items-center justify-center rounded-xs bg-[var(--primary)] text-button-m font-bold text-[var(--text-on-primary)]">
          T
        </span>
        <span className="text-heading-xs text-[var(--text-strong)]">트레이닝 저널</span>
      </Link>

      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isNavItemActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex items-center gap-3 rounded-xs px-3 py-2.5 text-button-m outline-none',
              'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
              'focus-visible:shadow-[var(--ring-focus)]',
              active
                ? 'bg-[var(--primary-soft)] text-[var(--primary)] font-medium'
                : 'text-[var(--text-muted)] pointer-hover:bg-[var(--surface-sunken)] pointer-hover:text-[var(--text-default)]',
            )}
          >
            <Icon width={20} height={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
