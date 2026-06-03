'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchTechniques } from '@/entities/technique';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { Button, EmptyState, TechniqueIcon } from '@/shared/ui';

import {
  clearFilters,
  DEFAULT_TECHNIQUE_FILTERS,
  filterAndSortTechniques,
  isAnyFilterActive,
  type TechniqueFilters,
} from '../model/filters';
import { TechniqueCard } from './TechniqueCard';
import { TechniqueFavoriteStar } from './TechniqueFavoriteStar';
import { TechniqueFilterBar } from './TechniqueFilterBar';

/**
 * TechniqueLibrary — 라이브러리 클라이언트 아일랜드 (F4-AC2/AC4 / Design §7d).
 *
 * 필터 상태(useState)를 소유하고 TechniqueFilterBar + 결과 그리드를 조합한다.
 * TanStack Query로 entity api(fetchTechniques)에서 사용자 기술을 직접 읽고,
 * 순수 filterAndSortTechniques 결과를 useMemo 로 메모이즈해 카드 그리드로 렌더한다.
 *
 * 데이터: 쿼리는 `enabled: isAuthEnabled()` 로 게이팅 — AUTH ON(현재)이면 실데이터,
 * AUTH OFF(개발 셸)면 비활성 → 기본값([])이 유지되어 결과가 비어 EmptyState 로 떨어진다
 * (가짜 기술 레코드 금지 — 휴면 빈 상태, calendar-screen 패턴과 동일).
 * 필터 활성 여부에 따라 두 가지 빈 상태를 구분한다.
 */
export function TechniqueLibrary() {
  const [filters, setFilters] = useState<TechniqueFilters>(DEFAULT_TECHNIQUE_FILTERS);

  // techniques(최근순). enabled OFF면 기본 [](휴면 → EmptyState). 저장(F4)은 ['techniques'] invalidate로 갱신.
  const { data: techniques = [] } = useQuery({
    queryKey: ['techniques', 'list'],
    queryFn: fetchTechniques,
    enabled: isAuthEnabled(),
  });

  const visible = useMemo(
    () => filterAndSortTechniques(techniques, filters),
    [techniques, filters],
  );

  const anyActive = isAnyFilterActive(filters);

  const resetFilters = () => setFilters((f) => clearFilters(f));

  return (
    <div className="flex flex-col gap-4">
      <TechniqueFilterBar filters={filters} onChange={setFilters} />

      {/* 필터/정렬(즐겨찾기 토글 포함) 변경 시 결과 수 변화를 SR에 알린다(WCAG 4.1.3). */}
      <p className="sr-only" role="status" aria-live="polite">
        {anyActive ? `필터 결과 ${visible.length}개 기술` : `기술 ${visible.length}개`}
      </p>

      {visible.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((t) => (
            // 카드 전체가 <Link>라 별표 버튼을 안에 못 넣는다(중첩 인터랙티브) → 카드 밖 절대배치 오버레이.
            <div key={t.id} className="relative">
              <TechniqueCard technique={t} />
              <TechniqueFavoriteStar
                techniqueId={t.id}
                isFavorite={t.is_favorite}
                className="absolute right-1.5 top-1.5 bg-[var(--surface-raised)] shadow-[var(--shadow-card)]"
              />
            </div>
          ))}
        </div>
      ) : anyActive ? (
        <EmptyState
          icon={<TechniqueIcon width={40} height={40} />}
          title="필터에 맞는 기술이 없습니다"
          description="필터를 바꾸거나 초기화해 보세요."
          action={
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              필터 초기화
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={<TechniqueIcon width={40} height={40} />}
          title="아직 등록한 기술이 없습니다"
          description="기술을 추가하면 종목·벨트 배지와 함께 카드로 정리됩니다. (라이브러리 연동 예정)"
        />
      )}
    </div>
  );
}
