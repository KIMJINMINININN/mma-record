import type { Discipline, RankTrack, StrikingStyle } from '@/shared/model/enums';

/** 종목 표시 메타 (PRD §4.1 / Design §2.6). 색은 브랜드 빨강과 충돌 회피한 종목 색. */
export interface DisciplineMeta {
  code: Discipline;
  label: string;
  /** 종목 색 (light 표면 기준) */
  color: string;
  /** dark 표면 기준 한 톤 밝은 색 */
  colorDark: string;
  /** 아이콘 개념 키 (DisciplineBadge에서 실제 아이콘에 매핑) */
  icon: string;
}

export const DISCIPLINE_META: Record<Discipline, DisciplineMeta> = {
  bjj_gi:    { code: 'bjj_gi',    label: '주짓수 (기)', color: '#1d4ed8', colorDark: '#3b82f6', icon: 'gi-collar' },
  bjj_nogi:  { code: 'bjj_nogi',  label: '노기 주짓수', color: '#0e7490', colorDark: '#22b8cf', icon: 'rashguard' },
  wrestling: { code: 'wrestling', label: '레슬링',      color: '#b45309', colorDark: '#f59e0b', icon: 'grip' },
  striking:  { code: 'striking',  label: '타격',        color: '#c2410c', colorDark: '#fb7355', icon: 'glove' },
  mma:       { code: 'mma',       label: 'MMA',         color: '#5b21b6', colorDark: '#8b5cf6', icon: 'octagon' },
};

/**
 * discipline → 랭크 트랙 매핑 (벨트 통합 결정).
 * 주짓수 기·노기는 하나의 bjj 벨트를 공유한다.
 */
export function disciplineToRankTrack(d: Discipline): RankTrack {
  if (d === 'bjj_gi' || d === 'bjj_nogi') return 'bjj';
  return d; // 'wrestling' | 'striking' | 'mma'
}

/** 벨트(주짓수)를 쓰는 종목인지 */
export function usesBelt(d: Discipline): boolean {
  return d === 'bjj_gi' || d === 'bjj_nogi';
}

export const STRIKING_STYLE_LABEL: Record<StrikingStyle, string> = {
  muay_thai: '무에타이',
  kickboxing: '킥복싱',
  boxing: '복싱',
  other: '기타',
};
