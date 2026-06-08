import { Skeleton } from '@/shared/ui';

/**
 * 공유 페이지 서스펜스 폴백 — 브랜드 헤더 줄 + 카드 스켈레톤 (share-view 로딩 관용구).
 * 실제 RPC 로딩 동안은 ShareView 내부 스켈레톤이 표시되며, 이건 라우트 전환 첫 프레임용.
 */
export default function ShareLoading() {
  return (
    <main
      className="min-h-dvh bg-[var(--surface-app)] px-4 py-6"
      aria-busy="true"
      aria-label="공유 세션 로딩 중"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)]">
          <Skeleton className="h-6 w-40" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-7 w-24 rounded-xxs" />
            <Skeleton className="h-7 w-16 rounded-xxs" />
          </div>
          <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-3/4" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
