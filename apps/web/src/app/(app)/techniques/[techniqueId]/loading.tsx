import { Skeleton } from '@/shared/ui';

/** 기술 상세 서스펜스 폴백 — 헤더/배지/미디어/주의점 스켈레톤. */
export default function TechniqueDetailLoading() {
  return (
    <article className="mx-auto max-w-3xl" aria-busy="true" aria-label="기술 상세 로딩 중">
      <Skeleton className="mb-4 h-5 w-24" />
      <Skeleton className="h-8 w-2/3" />
      <div className="mt-2 flex gap-2">
        <Skeleton className="h-6 w-24 rounded-xxs" />
        <Skeleton className="h-6 w-20 rounded-xxs" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="aspect-video w-full rounded-m" />
        <Skeleton className="aspect-video w-full rounded-m" />
      </div>
      <Skeleton className="mt-5 h-28 w-full rounded-m" />
    </article>
  );
}
