-- 0009_tags_taggables.sql — 태그 + 듀얼 FK 연결 (PRD F7)
create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,                             -- P1 태그 색 (PRD F7/AC4)
  created_at timestamptz not null default now(),
  unique (user_id, name)                  -- 사용자별 태그 이름 유일
);
create index tags_name_trgm on tags using gin (name gin_trgm_ops);  -- 자동완성/검색

alter table tags enable row level security;
create policy "tags_owns_rows" on tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 듀얼 FK: 태그가 세션 또는 기술에. 폴리모픽 대신 실제 FK 2개 + XOR.
create table taggables (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references tags(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  technique_id uuid references techniques(id) on delete cascade,
  check (num_nonnulls(session_id, technique_id) = 1)
);
create unique index taggables_uq_session   on taggables(tag_id, session_id)   where session_id is not null;
create unique index taggables_uq_technique on taggables(tag_id, technique_id) where technique_id is not null;
create index taggables_session_idx   on taggables(session_id)   where session_id is not null;
create index taggables_technique_idx on taggables(technique_id) where technique_id is not null;

alter table taggables enable row level security;
-- 태그 + 부모 모두 본인 소유여야
create policy "taggables_owns" on taggables
  for all
  using (
    exists (select 1 from tags t where t.id = tag_id and t.user_id = auth.uid())
    and (session_id   is null or exists (select 1 from sessions   s  where s.id  = session_id   and s.user_id  = auth.uid()))
    and (technique_id is null or exists (select 1 from techniques tc where tc.id = technique_id and tc.user_id = auth.uid()))
  )
  with check (
    exists (select 1 from tags t where t.id = tag_id and t.user_id = auth.uid())
    and (session_id   is null or exists (select 1 from sessions   s  where s.id  = session_id   and s.user_id  = auth.uid()))
    and (technique_id is null or exists (select 1 from techniques tc where tc.id = technique_id and tc.user_id = auth.uid()))
  );
