-- 0006_sessions.sql — 훈련 세션(PRD F2/F3) + 세션↔종목 N:M
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trained_on date not null,               -- 캘린더 기본 단위 (KST 날짜, 클라이언트가 보정 입력)
  gym text,                               -- 체육관/장소
  class_type class_type,
  duration_min int check (duration_min >= 0),
  intensity int check (intensity between 1 and 5),
  rounds int check (rounds >= 0),
  partners text,                          -- 자유 텍스트
  memo_md text,                           -- 요약 메모 (PRD F6)
  rating int check (rating between 1 and 5),
  visibility visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 캘린더 월간 그리드/하루상세 조회 인덱스 (PRD R2)
create index sessions_user_date_idx on sessions(user_id, trained_on);
create index sessions_memo_trgm on sessions using gin (memo_md gin_trgm_ops);
create index sessions_gym_trgm  on sessions using gin (gym gin_trgm_ops);

alter table sessions enable row level security;
create policy "sessions_owns_rows" on sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger sessions_set_updated_at before update on sessions
  for each row execute function set_updated_at();

-- 세션 ↔ 종목 N:M (한 훈련에 복수 종목, PRD §4.1)
create table session_disciplines (
  session_id uuid not null references sessions(id) on delete cascade,
  discipline discipline not null,
  primary key (session_id, discipline)
);
alter table session_disciplines enable row level security;
create policy "session_disciplines_via_parent" on session_disciplines
  for all
  using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));
