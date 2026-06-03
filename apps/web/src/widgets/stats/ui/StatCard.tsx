import type { ReactNode } from 'react';

/**
 * StatCard — 헤드라인 지표 카드 (F10 §S1 / 구현계획).
 *
 * 라벨 + 대형 수치(tabular-nums) + 단위(인라인) + 보조 텍스트. 카드 셸은 SessionCard와 동일 토큰.
 * `accent`면 수치를 빨강(--primary)으로 — 스트릭처럼 "신호" 의미일 때만(매트 타임은 중립).
 * 표시 전용 → 서버 렌더 가능.
 */

export interface StatCardProps {
  label: string;
  value: ReactNode;
  /** 수치 뒤 단위(예: '시간', '분', '일'). */
  unit?: ReactNode;
  /** 카드 하단 보조 텍스트(예: '24회', '최장 8일'). */
  sub?: ReactNode;
  /** true면 수치를 빨강(--primary)으로(스트릭 등 신호). 기본 중립(--text-strong). */
  accent?: boolean;
  className?: string;
}

export function StatCard({ label, value, unit, sub, accent = false, className }: StatCardProps) {
  return (
    <div
      className={`rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-card)] md:p-6${
        className ? ` ${className}` : ''
      }`}
    >
      <p className="text-button-s text-[var(--text-muted)]">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span
          className={`text-display-m tabular-nums ${
            accent ? 'text-[var(--primary)]' : 'text-[var(--text-strong)]'
          }`}
        >
          {value}
        </span>
        {unit != null && <span className="text-heading-s text-[var(--text-muted)]">{unit}</span>}
      </p>
      {sub != null && <p className="mt-1 text-body-s-400 text-[var(--text-muted)] tabular-nums">{sub}</p>}
    </div>
  );
}
