/**
 * 도메인 enum의 TS 단일 출처 (SSoT).
 * SQL `0002_enums.sql` 와 1:1 동치 — 한쪽 변경 시 반드시 같은 PR에서 양쪽 동시 수정.
 * (PRD §4 / Develop §4.3)
 */

export const DISCIPLINES = ['bjj_gi', 'bjj_nogi', 'wrestling', 'striking', 'mma'] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export const TECHNIQUE_CATEGORIES = [
  // 그래플링
  'guard', 'pass', 'sweep', 'submission', 'takedown', 'escape', 'transition', 'control', 'defense',
  // 타격
  'punch', 'kick', 'knee', 'elbow', 'clinch', 'combination', 'footwork',
  // 공통(그래플링/타격)
  'entry',
  // mma 전용
  'cage_work', 'ground_and_pound',
] as const;
export type TechniqueCategory = (typeof TECHNIQUE_CATEGORIES)[number];

export const POSITION_KINDS = [
  'standing', 'clinch', 'closed_guard', 'open_guard', 'half_guard', 'mount',
  'side_control', 'back_control', 'turtle', 'north_south', 'knee_on_belly', 'other',
] as const;
export type PositionKind = (typeof POSITION_KINDS)[number];

export const CLASS_TYPES = [
  'technique', 'drilling', 'sparring', 'open_mat', 'private', 'seminar', 'competition', 'strength',
] as const;
export type ClassType = (typeof CLASS_TYPES)[number];

export const BELTS = ['white', 'blue', 'purple', 'brown', 'black'] as const;
export type Belt = (typeof BELTS)[number];

export const MEDIA_KINDS = ['upload', 'youtube', 'external'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const VISIBILITIES = ['private', 'shared', 'public'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const STRIKING_STYLES = ['muay_thai', 'kickboxing', 'boxing', 'other'] as const;
export type StrikingStyle = (typeof STRIKING_STYLES)[number];

export const RANK_TRACKS = ['bjj', 'wrestling', 'striking', 'mma'] as const;
export type RankTrack = (typeof RANK_TRACKS)[number];
