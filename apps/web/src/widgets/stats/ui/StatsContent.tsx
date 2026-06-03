import { splitHoursMinutes, type StreakDay, type TopTechnique, type TrainingStats } from '@/entities/session';

import { DisciplineBars } from './DisciplineBars';
import { FrequencyChart } from './FrequencyChart';
import { StatCard } from './StatCard';
import { StreakDisplay } from './StreakDisplay';
import { TopTechniquesList } from './TopTechniquesList';

/**
 * StatsContent — 통계 대시보드 본문 조합 (F10 §S1~S4 / 구현계획).
 *
 * stats가 보장된(데이터 있음) 상태에서만 렌더된다. 도먼시(auth OFF)·빈 데이터·로딩 분기는
 * 상위 StatsScreen이 처리한다(EmptyState / 스켈레톤). 여기는 순수 합성 → 테스트 용이.
 */

export interface StatsContentProps {
  stats: TrainingStats;
  /** 최근 N일 점 행(StreakDisplay). */
  streakDays: StreakDay[];
  topTechniques: TopTechnique[];
}

export function StatsContent({ stats, streakDays, topTechniques }: StatsContentProps) {
  const { hours, minutes } = splitHoursMinutes(stats.totalMatMinutes);
  const matValue = hours > 0 ? hours : minutes;
  const matUnit = hours > 0 ? '시간' : '분';
  const matSub = hours > 0 ? `${minutes}분 · ${stats.sessionCount}회` : `${stats.sessionCount}회`;

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard label="총 매트 타임" value={matValue} unit={matUnit} sub={matSub} />
        <StreakDisplay streak={stats.streak} days={streakDays} />
      </div>
      <DisciplineBars distribution={stats.disciplineDistribution} />
      <FrequencyChart weekly={stats.weekly} monthly={stats.monthly} />
      <TopTechniquesList items={topTechniques} />
    </div>
  );
}
