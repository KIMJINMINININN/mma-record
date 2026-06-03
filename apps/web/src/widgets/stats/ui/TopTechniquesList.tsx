'use client';

import { useState } from 'react';

import { DisciplineChip } from '@/entities/discipline';
import type { TopTechnique } from '@/entities/session';

/**
 * TopTechniquesList — 최다 복습 기술 순위 (F10 §S4 / 구현계획).
 *
 * 기본 `initialCount`행, "더 보기"로 `maxCount`까지 확장. md+에서만 인라인 미니 막대(횟수 비율).
 * 색 단독 인코딩 금지: 순위·DisciplineChip 라벨·기술명·횟수가 모두 텍스트로 존재.
 */

export interface TopTechniquesListProps {
  items: TopTechnique[];
  /** 접힘 시 노출 행 수. 기본 5. */
  initialCount?: number;
  /** 펼침 시 최대 행 수. 기본 10. */
  maxCount?: number;
}

export function TopTechniquesList({ items, initialCount = 5, maxCount = 10 }: TopTechniquesListProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items.slice(0, maxCount) : items.slice(0, initialCount);
  const topCount = items.length > 0 ? items[0].count : 0; // items는 count 내림차순 → 첫 항목이 최대
  const canExpand = items.length > initialCount;

  return (
    <section className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)] md:p-5">
      <h2 className="text-heading-xs text-[var(--text-strong)]">가장 많이 복습한 기술</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-body-s-400 text-[var(--text-disabled)]">아직 복습한 기술이 없어요.</p>
      ) : (
        <>
          <ol className="mt-3 flex flex-col">
            {visible.map((t, i) => {
              const widthPct = topCount > 0 ? Math.round((t.count / topCount) * 100) : 0;
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-2 rounded-xs py-1.5 pointer-hover:bg-[var(--surface-sunken)]"
                >
                  <span className="w-5 shrink-0 text-center text-body-xs-500 tabular-nums text-[var(--text-muted)]">
                    {i + 1}
                  </span>
                  <DisciplineChip discipline={t.discipline} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-body-s-500 text-[var(--text-strong)]">
                    {t.name}
                  </span>
                  <span
                    className="hidden h-1.5 w-20 overflow-hidden rounded-xs bg-[var(--surface-sunken)] md:block"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-xs bg-[var(--text-default)]"
                      style={{ width: `${widthPct}%` }}
                    />
                  </span>
                  <span className="shrink-0 text-body-xs-500 tabular-nums text-[var(--text-muted)]">
                    {t.count}회
                  </span>
                </li>
              );
            })}
          </ol>

          {canExpand && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-2 inline-flex min-h-9 items-center rounded-xxs px-2 text-button-s text-[var(--primary)] focus-visible:shadow-[var(--ring-focus)] focus-visible:outline-none"
            >
              {expanded ? '접기' : '더 보기'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
