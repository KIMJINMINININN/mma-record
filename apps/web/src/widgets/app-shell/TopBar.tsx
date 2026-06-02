import Link from 'next/link';
import { TodayIcon } from '@/shared/ui';
import { SearchBar } from './SearchBar';
import { ThemeToggle } from './ThemeToggle';

/**
 * TopBar — 전역 상단바 (Design §7a: 🔍검색 / "오늘로" / 테마토글).
 *
 * sticky 고정은 AppShell 레이아웃이 담당하고, 여기선 내용 배치만.
 * 자식 SearchBar/ThemeToggle만 클라이언트이고 TopBar 자체는 서버 컴포넌트.
 * safe-area(상단 노치)는 AppShell 컬럼에서 패딩으로 흡수(§10.3).
 * "오늘로"는 내비게이션이므로 Button이 아닌 styled `<Link>`로 둔다(중첩 인터랙티브 회피).
 */
export function TopBar() {
  return (
    <header className="flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-2 md:px-5">
      <SearchBar />

      {/* "오늘로" — F2 캘린더 오늘로 점프. 지금은 캘린더 진입만. */}
      {/* TODO(F2): 캘린더가 ?date 쿼리를 읽도록 되면 `/calendar?date=<today-KST>`로 교체. */}
      <Link
        href="/calendar"
        className="hidden h-8 shrink-0 items-center gap-1.5 rounded-xxs px-2.5 text-button-s text-[var(--text-default)] outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] pointer-hover:bg-[var(--surface-sunken)] focus-visible:shadow-[var(--ring-focus)] sm:inline-flex"
      >
        <TodayIcon width={16} height={16} />
        오늘로
      </Link>

      <ThemeToggle />
    </header>
  );
}
