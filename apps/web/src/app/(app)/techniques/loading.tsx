import { Skeleton } from '@/shared/ui';

/** 기술 목록 서스펜스 폴백 — 헤더/필터/카드 그리드 스켈레톤. */
export default function TechniquesLoading() {
  return (
    <section className="mx-auto max-w-5xl" aria-busy="true" aria-label="기술 라이브러리 로딩 중">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-xxs" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </section>
  );
}
