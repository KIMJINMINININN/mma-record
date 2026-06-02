-- 0002_enums.sql — 도메인 enum (PRD §4 SSoT)

create type discipline as enum ('bjj_gi', 'bjj_nogi', 'wrestling', 'striking', 'mma');

-- 그래플링+타격+mma 분류 합집합 (PRD §4.2). UI가 종목에 맞는 부분집합만 노출.
create type technique_category as enum (
  -- 그래플링
  'guard', 'pass', 'sweep', 'submission', 'takedown', 'escape',
  'transition', 'control', 'defense',
  -- 타격
  'punch', 'kick', 'knee', 'elbow', 'clinch', 'combination', 'footwork',
  -- 공통(그래플링/타격)
  'entry',
  -- mma 전용
  'cage_work', 'ground_and_pound'
);

-- 'position'은 Postgres에서 타입명으로 못 씀(non-reserved, cannot be type name) → position_kind
create type position_kind as enum (
  'standing', 'clinch', 'closed_guard', 'open_guard', 'half_guard',
  'mount', 'side_control', 'back_control', 'turtle', 'north_south',
  'knee_on_belly', 'other'
);

create type class_type as enum (
  'technique', 'drilling', 'sparring', 'open_mat', 'private', 'seminar', 'competition', 'strength'
);

create type belt as enum ('white', 'blue', 'purple', 'brown', 'black');
-- stripes(0~4)는 int 컬럼 + check (PRD §4.3)

create type media_kind as enum ('upload', 'youtube', 'external');

-- 공유 대비 시드(PRD §12). MVP RLS는 visibility를 강제하지 않음.
create type visibility as enum ('private', 'shared', 'public');

-- 타격 세부 스타일(PRD §4.1). 타격 기술에 선택 부여.
create type striking_style as enum ('muay_thai', 'kickboxing', 'boxing', 'other');

-- 사용자 랭크 트랙(PRD F1, 벨트 통합 결정). bjj = gi+nogi 공유, 나머지는 level 사용.
create type rank_track as enum ('bjj', 'wrestling', 'striking', 'mma');
