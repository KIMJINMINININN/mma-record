import { Skeleton } from '@/shared/ui';

/** 태그 보기 서스펜스 폴백 — 헤더/선택 칩 줄/결과 목록 스켈레톤 (techniques/loading 관용구). */
export default function TagsLoading() {
  return (
    <section className="mx-auto max-w-5xl" aria-busy="true" aria-label="태그 보기 로딩 중">
      <Skeleton className="mb-4 h-8 w-32" />
      <div className="mb-5 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-xxs" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-3/4" />
        ))}
      </div>
    </section>
  );
}
