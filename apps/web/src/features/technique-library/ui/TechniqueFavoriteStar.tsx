'use client';

import { useState, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { FavoriteStar } from '@/shared/ui';

import { toggleTechniqueFavorite } from '../api/favorite-actions';

/**
 * TechniqueFavoriteStar — 기술 즐겨찾기 별표 클라 아일랜드 (PRD §9 P1).
 *
 * TechniqueCard 는 전체가 <Link>(서버 컴포넌트)라 버튼을 안에 못 넣는다(중첩 인터랙티브 HTML 위반).
 * 그래서 별표는 카드 **밖**의 절대배치 오버레이로 둔다(TechniqueLibrary 가 카드를 relative div 로 감싸 배치).
 * 상세 헤더에서도 동일 아일랜드를 재사용.
 *
 * 낙관적 갱신: 클릭 즉시 채움 토글 → 서버 액션 → 성공 시 ['techniques']/['technique',id] 무효화로
 * 다른 표면 동기화, 실패 시 롤백 + 토스트(TagManager 토스트 분기 미러). prop(서버 진실) 변화 시 resync.
 * revalidatePath 는 RSC용이라 클라 useQuery 캐시는 별도로 invalidate 한다.
 */
export interface TechniqueFavoriteStarProps {
  techniqueId: string;
  isFavorite: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function TechniqueFavoriteStar({
  techniqueId,
  isFavorite,
  size = 'sm',
  className,
}: TechniqueFavoriteStarProps) {
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState(isFavorite);
  const [lastProp, setLastProp] = useState(isFavorite);
  const [pending, startTransition] = useTransition();

  // 서버 진실(prop)이 바뀌면 렌더 중 동기화(리페치/다른 표면 반영). useEffect 대신 React 권장
  // "렌더 중 상태 조정"(이전 prop 비교) — effect-setState 캐스케이드 회피.
  if (isFavorite !== lastProp) {
    setLastProp(isFavorite);
    setOptimistic(isFavorite);
  }

  const onToggle = () => {
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      const res = await toggleTechniqueFavorite(techniqueId, next);
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['techniques'] });
        // exact: true — is_favorite 를 담은 단일 기술 본체만 갱신. prefix 매칭이면 상세의
        // sessions/tags/media 서브쿼리(['technique',id,*], 비싼 임베드)까지 헛리페치된다.
        queryClient.invalidateQueries({ queryKey: ['technique', techniqueId], exact: true });
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
