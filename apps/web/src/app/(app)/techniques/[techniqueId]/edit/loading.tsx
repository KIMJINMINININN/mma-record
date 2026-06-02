import { Skeleton } from '@/shared/ui';

/** 기술 편집 서스펜스 폴백 — 뒤로/제목/필드 스켈레톤(생성 폴백과 동일 톤). */
export default function TechniqueEditLoading() {
  return (
    <section className="mx-auto max-w-3xl" aria-busy="true" aria-label="기술 편집 로딩 중">
      <Skeleton className="mb-4 h-5 w-24" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <div className="mt-5 flex flex-col gap-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-xs" />
          </div>
        ))}
        <Skeleton className="h-12 w-full rounded-xs" />
      </div>
    </section>
  );
}
