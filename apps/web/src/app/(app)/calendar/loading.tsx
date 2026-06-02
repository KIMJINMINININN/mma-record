import { Skeleton } from '@/shared/ui';

/**
 * 캘린더 서스펜스 폴백 (Develop §6b / Design §7a·§7b) — 상단바 + 월 그리드 + Day Detail 스켈레톤.
 * CalendarScreen의 2열 레이아웃(lg+: 그리드 | 상세)과 정렬.
 */
export default function CalendarLoading() {
  return (
    <section className="mx-auto max-w-6xl" aria-busy="true" aria-label="캘린더 로딩 중">
      {/* 상단바: 월 네비 + 뷰탭/세션 */}
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* 월 그리드 */}
        <div className="overflow-hidden rounded-m border border-[var(--border-subtle)]">
          <div className="grid grid-cols-7 gap-px bg-[var(--border-subtle)]">
            {Array.from({ length: 42 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-none md:h-24" />
            ))}
          </div>
        </div>

        {/* Day Detail */}
        <div className="space-y-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-32 w-full rounded-m" />
        </div>
      </div>
    </section>
  );
}
