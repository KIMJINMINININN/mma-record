import { Skeleton } from '@/shared/ui';

/**
 * StatsSkeleton — 통계 대시보드 로딩 폴백 (F10 / 구현계획).
 * StatsContent 레이아웃(2 hero + 4 섹션 카드: 종목·포지션·빈도·최다복습)과 정렬해 CLS를 줄인다.
 * route loading.tsx(서버 서스펜스)와 StatsScreen 클라이언트 쿼리 로딩 양쪽에서 재사용.
 */
export function StatsSkeleton() {
  return (
    <div className="space-y-5 md:space-y-6" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-28 rounded-m" />
        <Skeleton className="h-28 rounded-m" />
      </div>
      <Skeleton className="h-40 rounded-m" />
      <Skeleton className="h-40 rounded-m" />
      <Skeleton className="h-48 rounded-m" />
      <Skeleton className="h-56 rounded-m" />
    </div>
  );
}
