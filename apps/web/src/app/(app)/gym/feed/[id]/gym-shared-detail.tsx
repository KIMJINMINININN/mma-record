'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { EmptyState, Skeleton, ChevronLeftIcon, HIT_AREA_44_Y } from '@/shared/ui';
import { SharedResourceCard } from '@/widgets/shared-resource';
import type { SharedResource } from '@/shared/model/shared-resource';
import { GymComments } from '@/features/gym-share';
import { getGymSharedDetail, gymSharedDetailKey } from '@/entities/gym-share';

/**
 * GymSharedDetail — 체육관 공유 항목 상세(2b) + 양방향 코멘트(2c).
 * (app) 인증가드 + get_gym_shared_detail의 gym 권한({공유 관원, 관장})으로 접근 제한.
 * 카드는 widgets/shared-resource 재사용(F11 공유와 동일 형태). 권한 없으면 RPC throw → isError 안내.
 */
export function GymSharedDetail({ gymShareId }: { gymShareId: string }) {
  const {
    data: envelope,
    isLoading,
    isError,
  } = useQuery({
    queryKey: gymSharedDetailKey(gymShareId),
    queryFn: () => getGymSharedDetail(gymShareId),
    retry: false,
    staleTime: 60_000,
  });

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/gym/feed"
        className={`inline-flex items-center gap-1 self-start rounded-xxs py-1 text-button-s text-[var(--text-muted)] outline-none transition-colors pointer-hover:text-[var(--text-default)] focus-visible:shadow-[var(--ring-focus)] ${HIT_AREA_44_Y}`}
      >
        <ChevronLeftIcon width={16} height={16} />
        피드
      </Link>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-m" />
      ) : isError ? (
        <EmptyState
          title="열람할 수 없어요"
          description="이 항목을 볼 권한이 없거나, 공유가 해제됐을 수 있어요."
        />
      ) : !envelope ? (
        <EmptyState title="없는 공유예요" description="이미 해제된 항목일 수 있어요." />
      ) : !envelope.data ? (
        <EmptyState title="삭제된 기록이에요" description="원본 세션/기술이 삭제됐어요." />
      ) : (
        <div className="flex flex-col gap-5">
          <SharedResourceCard resource={envelope as SharedResource} />
          <GymComments gymShareId={gymShareId} />
        </div>
      )}
    </div>
  );
}
