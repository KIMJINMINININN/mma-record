'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import { EmptyState, Skeleton } from '@/shared/ui';
import { SharedResourceCard, type SharedResource } from '@/widgets/shared-resource';

import { ShareComments } from './share-comments';

/**
 * ShareView — 공유 토큰으로 받은 자원(세션 OR 기술)을 익명 읽기 전용으로 렌더
 * (F11 / 0022_shares.sql · 0024_share_technique.sql).
 *
 * (app) 그룹 밖이라 인증 가드가 없다 → 브라우저 Supabase 클라이언트로 `get_shared_resource(p_token)`
 * 봉투 RPC(security definer, anon grant)를 호출한다. RPC가 `{type, data}` 합성 jsonb를 돌려주며,
 * 카드 렌더는 widgets/shared-resource(체육관 공유 상세와 공유)에 위임한다. null/빈 반환이면 "존재하지
 * 않거나 만료된 공유" 안내(토큰 추측/만료/삭제 모두 동일 처리 — 자원 존재 여부 누설 방지).
 *
 * 유효한 공유에서만 카드 아래에 코멘트 섹션(<ShareComments> · 0025_comments.sql)을 함께 렌더한다.
 */

/** 공유 데이터를 가져오는 쿼리 훅 — 토큰별 캐시. 봉투 RPC가 null이거나 data가 null이면 빈 공유로 취급. */
function useSharedResource(token: string) {
  return useQuery<SharedResource | null>({
    queryKey: ['share', 'resource', token],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('get_shared_resource', { p_token: token });
      if (error) throw new Error(error.message);
      const envelope = (data as SharedResource | null) ?? null;
      if (!envelope || !envelope.data) return null;
      return envelope;
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function ShareView({ token }: { token: string }) {
  const { data: result, isLoading, isError } = useSharedResource(token);

  if (isLoading) return <ShareViewSkeleton />;

  // 오류(네트워크/RPC 실패)거나 매칭 없음(null) → 동일 안내(자원 존재 여부 누설 방지).
  if (isError || !result) {
    return (
      <EmptyState
        title="존재하지 않거나 만료된 공유예요"
        description="링크가 잘못되었거나, 작성자가 공유를 해제했을 수 있어요."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <SharedResourceCard resource={result} />
      <ShareComments token={token} />
    </div>
  );
}

/** 로딩 스켈레톤 — 카드 형태(헤더 + 본문 섹션). loading.tsx와 별개로 쿼리 로딩 동안 표시. */
function ShareViewSkeleton() {
  return (
    <div
      className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)]"
      aria-busy="true"
      aria-label="공유 로딩 중"
    >
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
  );
}
