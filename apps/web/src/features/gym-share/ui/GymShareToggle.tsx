'use client';

import { useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/shared/ui';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import { fetchMyGym, GYM_QUERY_KEY } from '@/entities/gym';
import {
  listMyGymShares,
  gymSharesKey,
  GYM_FEED_KEY,
  type GymShareResourceType,
} from '@/entities/gym-share';

/**
 * features/gym-share — "체육관에 공유" 토글(세션 카드 / 기술 상세에 배치).
 * 체육관 소속자에게만 노출. 본인 기록을 체육관에 공유/해제(0029 share_to_gym/unshare_from_gym).
 * 미소속이면 아무것도 렌더하지 않는다(null).
 */
export function GymShareToggle({
  resourceType,
  resourceId,
}: {
  resourceType: GymShareResourceType;
  resourceId: string;
}) {
  const authed = isAuthEnabled();
  const qc = useQueryClient();

  const { data: gym } = useQuery({ queryKey: GYM_QUERY_KEY, queryFn: fetchMyGym, enabled: authed });
  const { data: shared = [] } = useQuery({
    queryKey: gymSharesKey(resourceType),
    queryFn: () => listMyGymShares(resourceType),
    enabled: authed && !!gym,
  });

  const [pending, startTransition] = useTransition();

  // 미소속 → 토글 미노출(체육관 기능은 소속자 전용).
  if (!authed || !gym) return null;

  const isShared = shared.includes(resourceId);

  const onToggle = () =>
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = isShared
        ? await supabase.rpc('unshare_from_gym', {
            p_resource_type: resourceType,
            p_resource_id: resourceId,
          })
        : await supabase.rpc('share_to_gym', {
            p_resource_type: resourceType,
            p_resource_id: resourceId,
          });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(isShared ? '체육관 공유를 해제했어요' : '체육관에 공유했어요');
      qc.invalidateQueries({ queryKey: gymSharesKey(resourceType) });
      qc.invalidateQueries({ queryKey: GYM_FEED_KEY });
    });

  return (
    <Button
      size="sm"
      variant={isShared ? 'secondary' : 'ghost'}
      disabled={pending}
      aria-pressed={isShared}
      title={isShared ? '체육관 공유 해제' : '체육관에 공유'}
      onClick={onToggle}
    >
      {isShared ? '🏠 공유중' : '🏠 체육관'}
    </Button>
  );
}
