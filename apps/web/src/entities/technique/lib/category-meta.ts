import type { Discipline, TechniqueCategory } from '@/shared/model/enums';
import { TECHNIQUE_CATEGORIES } from '@/shared/model/enums';

/** 기술 분류 한글 라벨 (PRD §4.2). */
export const CATEGORY_LABEL: Record<TechniqueCategory, string> = {
  // 그래플링
  guard: '가드',
  pass: '패스',
  sweep: '스윕',
  submission: '서브미션',
  takedown: '테이크다운',
  escape: '이스케이프',
  transition: '트랜지션',
  control: '컨트롤',
  defense: '디펜스',
  // 타격
  punch: '펀치',
  kick: '킥',
  knee: '니',
  elbow: '엘보',
  clinch: '클린치',
  combination: '콤비네이션',
  footwork: '풋워크',
  // 공통(그래플링/타격)
  entry: '엔트리(셋업)',
  // mma 전용
  cage_work: '케이지워크',
  ground_and_pound: '그라운드앤파운드',
};

/** 그래플링 종목(주짓수 기·노기, 레슬링)에서 노출하는 분류 (PRD §4.2). */
const GRAPPLING_CATEGORIES: TechniqueCategory[] = [
  'guard', 'pass', 'sweep', 'submission', 'takedown', 'escape', 'transition', 'control', 'defense', 'entry',
];

/** 타격 종목에서 노출하는 분류 (PRD §4.2). */
const STRIKING_CATEGORIES: TechniqueCategory[] = [
  'punch', 'kick', 'knee', 'elbow', 'clinch', 'combination', 'defense', 'footwork', 'entry',
];

/**
 * 종목별 선택 가능한 기술 분류 (PRD §4.2).
 * 그래플링(주짓수 기·노기, 레슬링) / 타격 / mma(전체)로 분기.
 */
export function categoriesForDiscipline(d: Discipline): TechniqueCategory[] {
  if (d === 'bjj_gi' || d === 'bjj_nogi' || d === 'wrestling') return GRAPPLING_CATEGORIES;
  if (d === 'striking') return STRIKING_CATEGORIES;
  return [...TECHNIQUE_CATEGORIES]; // 'mma' — 전체
}
