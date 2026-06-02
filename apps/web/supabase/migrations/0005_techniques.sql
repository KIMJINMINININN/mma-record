-- 0005_techniques.sql — 기술 카탈로그 (PRD F4). 순수 user-owned(프리셋은 0015에서 소유 복사).
create table techniques (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  discipline discipline not null,
  category technique_category not null,
  position position_kind,                 -- 컬럼명 position / 타입 position_kind. 선택(주로 그래플링)
  striking_style striking_style,          -- 타격만(PRD §4.1). 비타격 기술은 null.
  belt belt,                              -- "벨트 적합도"(주짓수만, 주관 가이드, PRD §4.3)
  belt_stripes int check (belt_stripes between 0 and 4),
  description_md text,                    -- 마크다운 설명
  details_md text,                        -- 주의점/디테일 (PRD F6 — UI 강조박스)
  visibility visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 글로벌 검색 fuzzy (PRD F8)
create index techniques_name_trgm on techniques using gin (name gin_trgm_ops);
create index techniques_desc_trgm on techniques using gin (description_md gin_trgm_ops);
create index techniques_user_disc_idx on techniques(user_id, discipline, category);

alter table techniques enable row level security;
create policy "techniques_owns_rows" on techniques
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger techniques_set_updated_at before update on techniques
  for each row execute function set_updated_at();
