import type {
  Belt,
  ClassType,
  Discipline,
  Level,
  PositionKind,
  TechniqueCategory,
} from './enums';

/**
 * 공유된 세션/기술 jsonb 형태(읽기 전용) — 최하위(shared) 도메인 타입.
 * F11 토큰 공유(get_shared_resource)와 체육관 공유 상세(get_gym_shared_detail)가 동일 형태라
 * widgets(카드)·entities(쿼리)·app(뷰)가 모두 여기서 가져온다.
 * SSoT: 0022/0024(토큰) · 0030(체육관) RPC의 jsonb_build_object.
 */

export interface SharedMedia {
  kind: 'youtube' | 'external';
  youtube_video_id: string | null;
  external_url: string | null;
  title: string | null;
}

export interface SharedSessionTechnique {
  name: string;
  discipline: Discipline;
  day_memo_md: string | null;
}

export interface SharedSession {
  trained_on: string;
  gym: string | null;
  class_type: ClassType | null;
  duration_min: number | null;
  intensity: number | null;
  rounds: number | null;
  partners: string | null;
  memo_md: string | null;
  disciplines: Discipline[];
  techniques: SharedSessionTechnique[];
  tags: string[];
  media: SharedMedia[];
}

export interface SharedTechniqueResource {
  name: string;
  discipline: Discipline;
  category: TechniqueCategory;
  position: PositionKind | null;
  striking_style: string | null;
  belt: Belt | null;
  belt_stripes: number | null;
  level: Level | null;
  description_md: string | null;
  details_md: string | null;
  tags: string[];
  media: SharedMedia[];
}

/** 봉투 — type 으로 분기. data 가 null 이면 자원 없음(삭제됨). */
export type SharedResource =
  | { type: 'session'; data: SharedSession }
  | { type: 'technique'; data: SharedTechniqueResource };

/** RPC 봉투 원형(data 가 null 가능 — 삭제된 원본). */
export type SharedResourceEnvelope =
  | { type: 'session'; data: SharedSession | null }
  | { type: 'technique'; data: SharedTechniqueResource | null };
