-- 0022_shares.sql — 공유 공개 링크 (F11 MVP, PRD §12, 2026-06-08)
-- 세션을 토큰 링크로 공개 읽기 공유. shares(소유자만 관리) + get_shared_session RPC(익명 읽기).
-- MVP: 세션만(기술은 후속, resource_type에 자리만), 생성/조회/삭제, 코멘트 후속.
-- 공유 뷰는 RLS(auth.uid()=user_id)를 우회해야 익명이 보므로 security definer RPC로 한정 노출한다
-- (토큰 보유자만, 업로드 영상은 서명URL 필요 → 제외하고 youtube/external 미디어만).

create table shares (
  id uuid primary key default gen_random_uuid(),
  -- URL용 토큰 — uuid hex(32자, 하이픈 제거). 추측 불가, 유일.
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  resource_type text not null check (resource_type in ('session', 'technique')),
  resource_id uuid not null,                -- polymorphic(타입별 sessions/techniques) → FK 없음, RPC join으로 검증
  created_at timestamptz not null default now()
);
create index shares_owner_idx on shares (owner_id);
create index shares_resource_idx on shares (resource_type, resource_id);

alter table shares enable row level security;

-- 소유자만 관리(생성/조회/삭제). 공개 읽기는 get_shared_* RPC(security definer)가 담당 — 직접 select 불가.
create policy shares_owner_all on shares
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- 토큰으로 공유된 세션을 익명 읽기(읽기 전용 합성 jsonb). RLS 우회는 토큰 보유자 + 이 함수 범위로만 한정.
-- 업로드 영상(storage_path)은 anon 서명URL 불가라 제외 — youtube/external 미디어만 노출.
create or replace function public.get_shared_session(p_token text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select jsonb_build_object(
    'trained_on', s.trained_on,
    'gym', s.gym,
    'class_type', s.class_type,
    'duration_min', s.duration_min,
    'intensity', s.intensity,
    'rounds', s.rounds,
    'partners', s.partners,
    'memo_md', s.memo_md,
    'disciplines', (
      select coalesce(jsonb_agg(sd.discipline order by sd.discipline), '[]'::jsonb)
      from session_disciplines sd where sd.session_id = s.id
    ),
    'techniques', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', t.name, 'discipline', t.discipline, 'day_memo_md', st.day_memo_md
      )), '[]'::jsonb)
      from session_techniques st join techniques t on t.id = st.technique_id
      where st.session_id = s.id
    ),
    'tags', (
      select coalesce(jsonb_agg(tg.name order by tg.name), '[]'::jsonb)
      from taggables tb join tags tg on tg.id = tb.tag_id where tb.session_id = s.id
    ),
    'media', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'kind', ma.kind, 'youtube_video_id', ma.youtube_video_id,
        'external_url', ma.external_url, 'title', ma.title
      )) filter (where ma.kind in ('youtube', 'external')), '[]'::jsonb)
      from media_links ml join media_assets ma on ma.id = ml.media_id
      where ml.session_id = s.id
    )
  )
  from shares sh
  join sessions s on s.id = sh.resource_id
  where sh.token = p_token and sh.resource_type = 'session';
$$;

-- 익명(anon) + 로그인 둘 다 호출 가능 — 공유 링크는 로그인 없이 열린다.
grant execute on function public.get_shared_session(text) to anon, authenticated;
