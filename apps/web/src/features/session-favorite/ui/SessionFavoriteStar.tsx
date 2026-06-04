'use client';

import { useState, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { FavoriteStar } from '@/shared/ui';

import { toggleSessionFavorite } from '../api/favorite-actions';

/**
 * SessionFavoriteStar — 세션 즐겨찾기 별표 클라 아일랜드 (PRD §9 P1).
 *
 * SessionCard(서버 컴포넌트, 비링크)의 헤더에 끼워 넣는 작은 클라 아일랜드.
 * 낙관적 토글 → toggleSessionFavorite → 성공 시 ['calendar'] prefix 무효화(월/주/아젠다/즐겨찾기 동기화),
 * 실패 시 롤백 + 토스트. prop(서버 진실) 변화 시 resync. (TechniqueFavoriteStar 와 동일 관용구.)
 */
export interface SessionFavoriteStarProps {
  sessionId: string;
  isFavorite: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function SessionFavoriteStar({
  sessionId,
  isFavorite,
  size = 'sm',
  className,
}: SessionFavoriteStarProps) {
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState(isFavorite);
  const [lastProp, setLastProp] = useState(isFavorite);
  const [pending, startTransition] = useTransition();

  // 서버 진실(prop) 변화 시 렌더 중 동기화(useEffect 대신 — React 권장 "렌더 중 상태 조정").
  if (isFavorite !== lastProp) {
    setLastProp(isFavorite);
    setOptimistic(isFavorite);
  }

  const onToggle = () => {
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      const res = await toggleSessionFavorite(sessionId, next);
      if (res.ok) {
        // prefix 무효화(exact 금지) — ['calendar'] 가 월/주/아젠다 + 즐겨찾기 cross-month 뷰
        // (['calendar','favorites'])를 함께 갱신한다. exact:true 로 바꾸면 즐겨찾기 뷰에서 별표를
        // 해제해도 목록이 stale 로 남는다(TechniqueFavoriteStar 는 다른 이유로 exact:true — 혼동 주의).
        queryClient.invalidateQueries({ queryKey: ['calendar'] });
      } else {
        setOptimistic(!next); // 롤백
        if (res.dormant) toast.info(res.error);
        else toast.error(res.error);
      }
    });
  };

  return (
    <FavoriteStar
      isFavorite={optimistic}
      pending={pending}
      onToggle={onToggle}
      size={size}
      className={className}
    />
  );
}
