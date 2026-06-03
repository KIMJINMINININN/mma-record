import { Skeleton } from '@/shared/ui';
import { StatsSkeleton } from '@/widgets/stats';

/**
 * 통계 서스펜스 폴백 (F10) — 헤더 스켈레톤 + StatsSkeleton(StatsContent 레이아웃 정렬).
 */
export default function StatsLoading() {
  return (
    <section className="mx-auto max-w-3xl" aria-busy="true" aria-label="통계 로딩 중">
      <Skeleton className="mb-6 h-8 w-24" />
      <StatsSkeleton />
    </section>
  );
}
