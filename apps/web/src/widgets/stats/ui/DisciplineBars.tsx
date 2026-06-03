import type { CSSProperties } from 'react';

import { DISCIPLINE_META, DisciplineChip } from '@/entities/discipline';
import { DISCIPLINES, type Discipline } from '@/shared/model/enums';

/**
 * DisciplineBars — 종목별 세션 분포 가로 막대 (F10 §S2 / 구현계획).
 *
 * 전 종목 행(미훈련 0 포함, enum-exhaustive), count 내림차순. 막대 채움색은 DisciplineChip 공식
 * (light-dark + mma dark 대비 보정)을 재사용. 색만으로 식별하지 않도록 칩 라벨 + 수치를 함께 표기(F9).
 * 표시 전용 → 서버 렌더 가능.
 */

export interface DisciplineBarsProps {
  distribution: Record<Discipline, number>;
}

/** 막대 채움색 — DisciplineChip.selectedFill과 동일(mma dark만 +10% 밝게 대비 보정). */
function fillColor(d: Discipline): string {
  const meta = DISCIPLINE_META[d];
  const dark = d === 'mma' ? `color-mix(in srgb, ${meta.colorDark}, white 10%)` : meta.colorDark;
  return `light-dark(${meta.color}, ${dark})`;
}

export function DisciplineBars({ distribution }: DisciplineBarsProps) {
  const total = DISCIPLINES.reduce((sum, d) => sum + distribution[d], 0);
  const sorted = [...DISCIPLINES].sort((a, b) => distribution[b] - distribution[a]);

  return (
    <section className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)] md:p-5">
      <h2 className="text-heading-xs text-[var(--text-strong)]">종목별 세션 분포</h2>
      <p className="mt-0.5 text-body-xs-400 tabular-nums text-[var(--text-muted)]">
        종목 출현 합계 {total}회 (2종목 세션은 각각 집계)
      </p>

      {total === 0 ? (
        <p className="mt-3 text-body-s-400 text-[var(--text-disabled)]">종목 정보 없음</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {sorted.map((d) => {
            const count = distribution[d];
            const pct = Math.round((count / total) * 100);
            const barStyle: CSSProperties = { width: `${pct}%`, backgroundColor: fillColor(d) };
            return (
              <li key={d} className="grid grid-cols-[7rem_1fr_auto] items-center gap-2">
                <DisciplineChip discipline={d} size="xs" />
                <span
                  className="h-2.5 overflow-hidden rounded-xs bg-[var(--surface-sunken)]"
                  aria-hidden="true"
                >
                  <span className="block h-full rounded-xs" style={barStyle} />
                </span>
                <span className="text-body-xs-500 tabular-nums text-[var(--text-muted)]">
                  {count}회 · {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
