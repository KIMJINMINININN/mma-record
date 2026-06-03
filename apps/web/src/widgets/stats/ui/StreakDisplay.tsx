import type { StreakDay, StreakResult } from '@/entities/session';

/**
 * StreakDisplay — 연속 기록 카드 (F10 §S1 / 구현계획).
 *
 * 현재 스트릭(빨강) + 최장 + 최근 N일 점 행(SessionCard IntensityDots 관용구 재사용) + 격려 카피.
 * "오늘 유예" 규칙 시각화: 오늘 점은 ring으로 강조, 오늘 미기록이어도 current가 살아있으면 그 사실을 카피로 안내.
 * 색만으로 식별하지 않도록 점 행에 role=img + aria-label(현재/기록일 수)을 둔다(F9 색약).
 * 표시 전용 → 서버 렌더 가능.
 */

export interface StreakDisplayProps {
  streak: StreakResult;
  /** 최근 N일(oldest→newest, 마지막이 오늘). */
  days: StreakDay[];
}

export function StreakDisplay({ streak, days }: StreakDisplayProps) {
  const trainedCount = days.filter((d) => d.trained).length;
  const today = days[days.length - 1];
  const todayTrained = today?.trained ?? false;

  let encouragement: string;
  if (streak.current === 0) encouragement = '오늘 기록하고 스트릭을 시작하세요.';
  else if (todayTrained) encouragement = '오늘도 이어가고 있어요.';
  else encouragement = '어제까지 기록했어요 — 오늘 한 세션이면 이어집니다.';

  return (
    <div className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-card)] md:p-6">
      <p className="text-button-s text-[var(--text-muted)]">연속 기록</p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span className="text-display-m tabular-nums text-[var(--primary)]">{streak.current}</span>
        <span className="text-heading-s text-[var(--text-muted)]">일</span>
      </p>
      <p className="mt-1 text-body-s-400 text-[var(--text-muted)] tabular-nums">최장 {streak.longest}일</p>

      <div
        className="mt-3 flex flex-wrap items-center gap-1"
        role="img"
        aria-label={`현재 연속 ${streak.current}일, 최근 ${days.length}일 중 ${trainedCount}일 기록, 오늘 ${
          todayTrained ? '기록함' : '미기록'
        }`}
      >
        {days.map((d) => (
          <span
            key={d.dateISO}
            aria-hidden="true"
            className={[
              'size-2 rounded-full',
              d.trained ? 'bg-[var(--primary)]' : 'bg-[var(--border-strong)]',
              d.isToday
                ? 'ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--surface-raised)]'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </div>

      <p className="mt-3 text-body-s-500 text-[var(--text-default)]">{encouragement}</p>
    </div>
  );
}
