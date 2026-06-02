'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { TagInput, tagKey } from '@/features/tag-filter';
import { TechniqueCard } from '@/features/technique-library';
import { SessionCard } from '@/widgets/day-detail';
import { fetchTagNames, fetchTaggedItems } from '@/entities/tag';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { EmptyState, SearchIcon, Skeleton } from '@/shared/ui';

/**
 * TagsView — 태그 보기 클라이언트 아일랜드 (F7-AC2/AC3 / Design §7f).
 *
 * 선택 태그 상태(useState)를 소유하고, AND 필터 바(TagInput, 필터 모드) + 결과 그룹(기술/세션)을 조합한다.
 * 필터 모드라 allowCreate=false — 기존 태그(suggestions)에서만 고른다.
 *
 * 데이터(읽기 와이어링 #5): 두 쿼리를 `enabled: isAuthEnabled()` 로 게이팅한다.
 *  - suggestions: fetchTagNames() — 사용자 태그 이름(자동완성). AUTH OFF면 비활성 → 빈 목록.
 *  - 결과: fetchTaggedItems(selected) — 선택 태그를 모두 가진 기술/세션(선택이 있을 때만 enabled).
 * tags/taggables 행은 태그 attach(쓰기, F7 후속)가 붙어야 생기므로 그 전까지 라이브 쿼리가 정상적으로
 * 빈 결과를 돌려준다(가짜 데이터 금지 — calendar-screen/TechniqueLibrary 패턴과 동일). attach가 붙으면
 * 동일 컴포넌트가 자동 점등된다. 저장 쪽에서 ['tags'] invalidate 시 자동완성/결과가 갱신된다.
 */
export function TagsView() {
  const [selected, setSelected] = useState<string[]>([]);

  // 자동완성 후보(사용자 태그 이름). AUTH OFF면 비활성 → [] (휴면).
  const { data: suggestions = [] } = useQuery({
    queryKey: ['tags', 'names'],
    queryFn: fetchTagNames,
    enabled: isAuthEnabled(),
  });

  // 선택 집합 키(순서 무관 — AND라 정렬·소문자화로 안정화). 빈 선택이면 쿼리 비활성.
  const selectionKey = useMemo(() => selected.map(tagKey).sort(), [selected]);
  const hasSelection = selected.length > 0;

  const { data: results, isLoading } = useQuery({
    queryKey: ['tags', 'filter', selectionKey],
    queryFn: () => fetchTaggedItems(selected),
    enabled: isAuthEnabled() && hasSelection,
  });

  const techniques = results?.techniques ?? [];
  const sessions = results?.sessions ?? [];
  const isEmpty = techniques.length === 0 && sessions.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* 선택 AND 바 — 필터 모드(생성 비허용). §7f: 선택 칩 + (AND) 어포던스. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <TagInput
              value={selected}
              onChange={setSelected}
              allowCreate={false}
              suggestions={suggestions}
              label="태그 필터"
              placeholder="태그로 필터"
            />
          </div>
        </div>
        {selected.length > 1 && (
          <p className="text-body-xs-400 text-[var(--text-muted)]">
            선택한 태그를 <strong className="font-semibold">모두(AND)</strong> 가진 항목만 모아 봅니다.
          </p>
        )}
      </div>

      {/* 결과 — 미선택/로딩/빈/그룹 4-state. */}
      {!hasSelection ? (
        <EmptyState
          icon={<SearchIcon width={40} height={40} />}
          title="태그를 선택해 세션·기술을 모아보세요"
          description="여러 태그를 함께 고르면 모두 가진 항목만 AND로 좁혀 봅니다."
        />
      ) : isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-5 w-24" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={<SearchIcon width={40} height={40} />}
          title="선택한 태그에 해당하는 항목이 없습니다"
          description="선택한 태그가 모두 달린 세션·기술이 여기 모입니다."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {techniques.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-heading-xs text-[var(--text-strong)]">
                기술 <span className="text-[var(--text-muted)]">{techniques.length}</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                {techniques.map((t) => (
                  <TechniqueCard key={t.id} technique={t} />
                ))}
              </div>
            </section>
          )}
          {sessions.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-heading-xs text-[var(--text-strong)]">
                세션 <span className="text-[var(--text-muted)]">{sessions.length}</span>
              </h2>
              <div className="flex flex-col gap-3">
                {sessions.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
