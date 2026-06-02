-- 0007_session_techniques.sql — 세션↔기술 N:M + 그날 메모 (PRD F3/F6)
create table session_techniques (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  technique_id uuid not null references techniques(id) on delete cascade,
  day_memo_md text,                       -- "그날만의 메모" (PRD §4.6, F6/AC3)
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, technique_id)
);
-- 역참조("이 기술을 다룬 세션들")
create index session_techniques_technique_idx on session_techniques(technique_id);

alter table session_techniques enable row level security;
create policy "session_techniques_via_parent" on session_techniques
  for all
  using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));
