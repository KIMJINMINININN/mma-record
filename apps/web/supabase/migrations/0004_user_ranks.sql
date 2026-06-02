-- 0004_user_ranks.sql — rank_track 단위 랭크 (bjj 1행이 gi·nogi 공유)
create table user_ranks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track rank_track not null,              -- bjj | wrestling | striking | mma
  belt belt,                              -- bjj 트랙만(gi·nogi 공유). 그 외 null.
  stripes int check (stripes between 0 and 4),
  level text,                             -- 비bjj 트랙 '입문/중급/고급'(선택). PRD §4.3
  visibility visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, track)                 -- 트랙당 1 랭크 (bjj 1행이 gi+nogi 커버)
);
create index user_ranks_user_idx on user_ranks(user_id);

alter table user_ranks enable row level security;
create policy "user_ranks_owns_rows" on user_ranks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger user_ranks_set_updated_at before update on user_ranks
  for each row execute function set_updated_at();
-- discipline→track 매핑(entities/discipline lib): bjj_gi,bjj_nogi→bjj / wrestling,striking,mma→동일.
