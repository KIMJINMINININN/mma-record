import type { CSSProperties } from 'react';

import type { PositionCount } from '@/entities/session';
import { POSITION_LABEL } from '@/entities/technique';

/**
 * PositionBars — 다룬 기술의 포지션별 분포 가로 막대 (F10 P2).
 *
 * DisciplineBars 패턴 미러. 입력은 positionDistribution 결과(count>0·내림차순).
 * 포지션은 고유색이 없어 중립 단색 막대 + POSITION_LABEL 텍스트 + 수치(F9 — 색 단독 인코딩 아님).
 * position 미지정(null) 기술은 집계에서 빠지므로 "다룬 기술 N회 기준"은 분포 합과 일치한다.
 * 표시 전용 → 서버 렌더 가능.
 */
export interface PositionBarsProps {
  /** positionDistribution 결과(count>0, 내림차순). */
  distribution: PositionCount[];
}

export function PositionBars({ distribution }: PositionBarsProps) {
  const total = distribution.reduce((sum, p) => sum + p.count, 0);

  return (
    <section className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)] md:p-5">
      <h2 className="text-heading-xs text-[var(--text-strong)]">포지션별 분포</h2>
      <p className="mt-0.5 text-body-xs-400 tabular-nums text-[var(--text-muted)]">
        다룬 기술 {total}회 기준 · 포지션 미지정 기술 제외
      </p>

      {total === 0 ? (
        <p className="mt-3 text-body-s-400 text-[var(--text-disabled)]">포지션 정보 없음</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {distribution.map((p) => {
            const pct = Math.round((p.count / total) * 100);
            const barStyle: CSSProperties = { width: `${pct}%` };
            return (
              <li key={p.position} className="grid grid-cols-[7rem_1fr_auto] items-center gap-2">
                <span className="truncate text-body-xs-500 text-[var(--text-default)]">
                  {POSITION_LABEL[p.position]}
                </span>
                <span
                  className="h-2.5 overflow-hidden rounded-xs bg-[var(--surface-sunken)]"
                  aria-hidden="true"
                >
                  <span className="block h-full rounded-xs bg-[var(--text-default)]" style={barStyle} />
                </span>
                <span className="text-body-xs-500 tabular-nums text-[var(--text-muted)]">
                  {p.count}회 · {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
