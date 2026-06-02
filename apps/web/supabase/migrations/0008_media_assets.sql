-- 0008_media_assets.sql — 미디어(하이브리드, PRD F5) + 듀얼 FK 연결
create table media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind media_kind not null,               -- upload | youtube | external
  storage_path text,                      -- kind='upload': 'training-media/<user_id>/videos/<uuid>.mp4'
  duration_sec int,                       -- 업로드 길이 한도 검증/표시
  size_bytes bigint,                      -- 용량 한도 검증
  thumbnail_path text,                    -- 업로드 썸네일(Storage)
  youtube_video_id text,                  -- kind='youtube' (URL 아님, ID만)
  external_url text,                      -- kind='external'
  title text,
  visibility visibility not null default 'private',
  created_at timestamptz not null default now(),
  -- kind별 필수 컬럼 보장
  constraint media_kind_shape check (
    (kind = 'upload'   and storage_path is not null) or
    (kind = 'youtube'  and youtube_video_id is not null) or
    (kind = 'external' and external_url is not null)
  )
);
create index media_assets_user_idx on media_assets(user_id, created_at desc);

alter table media_assets enable row level security;
create policy "media_assets_owns_rows" on media_assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 듀얼 FK 연결: 한 미디어가 세션 또는 기술에. 폴리모픽 대신 실제 FK 2개 + XOR → DB 무결성·자동 cascade.
create table media_links (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references media_assets(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  technique_id uuid references techniques(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(session_id, technique_id) = 1)        -- 정확히 하나의 부모
);
create unique index media_links_uq_session   on media_links(media_id, session_id)   where session_id is not null;
create unique index media_links_uq_technique on media_links(media_id, technique_id) where technique_id is not null;
create index media_links_session_idx   on media_links(session_id)   where session_id is not null;
create index media_links_technique_idx on media_links(technique_id) where technique_id is not null;

alter table media_links enable row level security;
-- 미디어 + 부모 모두 본인 소유여야(교차 연결 차단)
create policy "media_links_owns" on media_links
  for all
  using (
    exists (select 1 from media_assets m where m.id = media_id and m.user_id = auth.uid())
    and (session_id   is null or exists (select 1 from sessions   s where s.id = session_id   and s.user_id = auth.uid()))
    and (technique_id is null or exists (select 1 from techniques t where t.id = technique_id and t.user_id = auth.uid()))
  )
  with check (
    exists (select 1 from media_assets m where m.id = media_id and m.user_id = auth.uid())
    and (session_id   is null or exists (select 1 from sessions   s where s.id = session_id   and s.user_id = auth.uid()))
    and (technique_id is null or exists (select 1 from techniques t where t.id = technique_id and t.user_id = auth.uid()))
  );
