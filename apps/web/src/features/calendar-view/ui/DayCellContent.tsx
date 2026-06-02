import { DisciplineChip } from '@/entities/discipline';
import type { CalendarDaySummary } from '@/entities/session';
import type { Discipline } from '@/shared/model/enums';

/**
 * DayCellContent — 월간 그리드 셀의 종목 점 + 세션 수 (Design §7a / §8 / F2-AC1).
 *
 * - 종목 점: DisciplineChip `size="dot"`(6px), 중복 종목 제거, 최대 MAX_DOTS 노출 후 `+N`.
 *   (한 셀에 같은 종목 중복 시 점 1개 — 종류 표현 우선, §8)
 * - 세션 수: 점 우측 `text-body-xxs-500` tabular-nums 배지 — 색약 보강(점만으로 식별 X, §10.1).
 * - 빈 날(summary 없음/세션 0): 아무것도 렌더하지 않음 → 셀은 hover 시 CSS `+` 고스트만.
 *
 * 표시 전용(상호작용 없음) → 서버에서도 렌더 가능. (부모 CalendarMonthGrid가 'use client')
 */

/** 셀에 노출하는 점 최대 개수 — 초과 시 마지막 슬롯을 `+N`으로. */
const MAX_DOTS = 4;

export interface DayCellContentProps {
  summary: CalendarDaySummary | undefined;
}

export function DayCellContent({ summary }: DayCellContentProps) {
  // 빈 날: 요약이 없거나 세션 수가 0이면 콘텐츠 없음(빈 셀 = + 고스트만).
  if (!summary || summary.session_count <= 0) return null;

  // 종목 중복 제거 — DISCIPLINES 정의 순서를 유지하기 위해 Set 후 원본 순서로 필터.
  const unique: Discipline[] = [];
  for (const d of summary.disciplines) {
    if (!unique.includes(d)) unique.push(d);
  }

  const visible = unique.slice(0, MAX_DOTS);
  const overflow = unique.length - visible.length;

  return (
    <div className="mt-auto flex w-full items-center gap-1">
      {/* 종목 점들 — 색+aria-label(DisciplineChip dot 내장)로 식별 */}
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        {visible.map((d) => (
          <DisciplineChip key={d} discipline={d} size="dot" />
        ))}
        {overflow > 0 && (
          <span
            className="text-body-xxs-500 leading-none text-[var(--text-muted)] tabular-nums"
            aria-label={`종목 ${overflow}개 더`}
          >
            +{overflow}
          </span>
        )}
      </span>

      {/* 세션 수 — 우측 정렬, 색약 보강 숫자 */}
      <span
        className="ml-auto text-body-xxs-500 leading-none text-[var(--text-muted)] tabular-nums"
        aria-label={`세션 ${summary.session_count}회`}
      >
        {summary.session_count}
      </span>
    </div>
  );
}
