-- 0030_gym_share_detail.sql — 체육관 Phase ②-b(코치 상세 열람) + ②-c(양방향 코멘트) (2026-06-10)
-- 2b: get_gym_shared_detail — 공유된 세션/기술 풀 상세(get_shared_session/technique와 동일 {type,data}
--     형태로 반환 → 웹 ShareCard 재사용). 토큰 대신 gym_share_id + gym 권한({공유 관원, 관장}).
-- 2c: gym_comments — 공유 항목에 코치↔관원 양방향 코멘트.
-- 전부 security definer + PUBLIC revoke→authenticated만(0028 H1). 권한 헬퍼는 내부 전용(grant 없음).
-- SSoT: docs/issue/20260610/gym-phase2-plan.md

-- 접근 권한 헬퍼(내부 전용): 이 gym_share를 볼 수 있나 = 공유 관원 OR 체육관 관장.
create or replace function public.can_access_gym_share(p_gym_share_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from gym_shares gs
    where gs.id = p_gym_share_id
      and (gs.member_id = auth.uid() or auth.uid() = (select owner_id from gyms g where g.id = gs.gym_id))
  );
$$;

-- ── 2b: 공유 상세(풀) ────────────────────────────────────────────────
-- 반환 {type, data}. 원본 세션/기술 삭제 시 data=null(웹은 "삭제된 기록" 처리). 미디어는 youtube/external만(0024 정책).
create or replace function public.get_gym_shared_detail(p_gym_share_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare v_gs gym_shares; v_data jsonb;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  select * into v_gs from gym_shares where id = p_gym_share_id;
  if v_gs.id is null then return null; end if;
  if not public.can_access_gym_share(p_gym_share_id) then raise exception '권한이 없습니다'; end if;

  if v_gs.resource_type = 'session' then
    select jsonb_build_object(
      'trained_on', s.trained_on, 'gym', s.gym, 'class_type', s.class_type,
      'duration_min', s.duration_min, 'intensity', s.intensity, 'rounds', s.rounds,
      'partners', s.partners, 'memo_md', s.memo_md,
      'disciplines', (select coalesce(jsonb_agg(sd.discipline order by sd.discipline), '[]'::jsonb)
        from session_disciplines sd where sd.session_id = s.id),
      'techniques', (select coalesce(jsonb_agg(jsonb_build_object(
          'name', t.name, 'discipline', t.discipline, 'day_memo_md', st.day_memo_md)), '[]'::jsonb)
        from session_techniques st join techniques t on t.id = st.technique_id where st.session_id = s.id),
      'tags', (select coalesce(jsonb_agg(tg.name order by tg.name), '[]'::jsonb)
        from taggables tb join tags tg on tg.id = tb.tag_id where tb.session_id = s.id),
      'media', (select coalesce(jsonb_agg(jsonb_build_object(
          'kind', ma.kind, 'youtube_video_id', ma.youtube_video_id,
          'external_url', ma.external_url, 'title', ma.title)) filter (where ma.kind in ('youtube','external')), '[]'::jsonb)
        from media_links ml join media_assets ma on ma.id = ml.media_id where ml.session_id = s.id)
    ) into v_data
    from sessions s where s.id = v_gs.resource_id;
    return jsonb_build_object('type', 'session', 'data', v_data);
  else
    select jsonb_build_object(
      'name', t.name, 'discipline', t.discipline, 'category', t.category, 'position', t.position,
      'striking_style', t.striking_style, 'belt', t.belt, 'belt_stripes', t.belt_stripes, 'level', t.level,
      'description_md', t.description_md, 'details_md', t.details_md,
      'tags', (select coalesce(jsonb_agg(tg.name order by tg.name), '[]'::jsonb)
        from taggables tb join tags tg on tg.id = tb.tag_id where tb.technique_id = t.id),
      'media', (select coalesce(jsonb_agg(jsonb_build_object(
          'kind', ma.kind, 'youtube_video_id', ma.youtube_video_id,
          'external_url', ma.external_url, 'title', ma.title)) filter (where ma.kind in ('youtube','external')), '[]'::jsonb)
        from media_links ml join media_assets ma on ma.id = ml.media_id where ml.technique_id = t.id)
    ) into v_data
    from techniques t where t.id = v_gs.resource_id;
    return jsonb_build_object('type', 'technique', 'data', v_data);
  end if;
end;
$$;

-- ── 2c: 코멘트(양방향) ──────────────────────────────────────────────
create table gym_comments (
  id           uuid primary key default gen_random_uuid(),
  gym_share_id uuid not null references gym_shares (id) on delete cascade,
  author_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body         text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at   timestamptz not null default now()
);
create index gym_comments_share_idx on gym_comments (gym_share_id, created_at);

alter table gym_comments enable row level security;
-- 백스톱(접근은 RPC): 열람 = 공유 관원/관장 / 삭제 = 작성자 OR 관장.
create policy gym_comments_select on gym_comments for select using (
  exists (select 1 from gym_shares gs where gs.id = gym_comments.gym_share_id
    and (gs.member_id = auth.uid() or auth.uid() = (select owner_id from gyms g where g.id = gs.gym_id)))
);
create policy gym_comments_delete on gym_comments for delete using (
  author_id = auth.uid()
  or exists (select 1 from gym_shares gs join gyms g on g.id = gs.gym_id
    where gs.id = gym_comments.gym_share_id and g.owner_id = auth.uid())
);

-- 코멘트 목록(오래된→최신). author_name=display_name('익명' fallback). can_delete=작성자 or 관장.
create or replace function public.get_gym_comments(p_gym_share_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare v_is_owner boolean;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if not public.can_access_gym_share(p_gym_share_id) then raise exception '권한이 없습니다'; end if;
  select (auth.uid() = (select owner_id from gyms g join gym_shares gs on gs.gym_id = g.id where gs.id = p_gym_share_id))
    into v_is_owner;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'author_name', coalesce(nullif(btrim(p.display_name), ''), '익명'),
      'body', c.body,
      'created_at', c.created_at,
      'can_delete', (c.author_id = auth.uid() or coalesce(v_is_owner, false))
    ) order by c.created_at), '[]'::jsonb)
    from gym_comments c
    left join profiles p on p.user_id = c.author_id
    where c.gym_share_id = p_gym_share_id
  );
end;
$$;

-- 코멘트 작성(공유 관원 OR 관장 — 양방향). 반환은 항목 형태(작성자 본인이라 can_delete=true).
create or replace function public.add_gym_comment(p_gym_share_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_row gym_comments;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if not public.can_access_gym_share(p_gym_share_id) then raise exception '권한이 없습니다'; end if;
  insert into gym_comments (gym_share_id, author_id, body)
  values (p_gym_share_id, auth.uid(), btrim(p_body))
  returning * into v_row;
  return jsonb_build_object(
    'id', v_row.id,
    'author_name', coalesce(nullif(btrim((select display_name from profiles where user_id = v_row.author_id)), ''), '익명'),
    'body', v_row.body,
    'created_at', v_row.created_at,
    'can_delete', true
  );
end;
$$;

-- 코멘트 삭제(작성자 OR 관장). 없거나 권한 없으면 0행 → found=false.
create or replace function public.delete_gym_comment(p_comment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  delete from gym_comments c
  using gym_shares gs
  where c.id = p_comment_id
    and c.gym_share_id = gs.id
    and (c.author_id = auth.uid() or auth.uid() = (select owner_id from gyms g where g.id = gs.gym_id));
  return found;
end;
$$;

-- 권한: 전부 로그인 필요. PUBLIC revoke 후 authenticated만(헬퍼 can_access_gym_share는 내부 전용 — grant 없음).
revoke execute on function public.can_access_gym_share(uuid) from public;
revoke execute on function public.get_gym_shared_detail(uuid) from public;
revoke execute on function public.get_gym_comments(uuid) from public;
revoke execute on function public.add_gym_comment(uuid, text) from public;
revoke execute on function public.delete_gym_comment(uuid) from public;

grant execute on function public.get_gym_shared_detail(uuid) to authenticated;
grant execute on function public.get_gym_comments(uuid) to authenticated;
grant execute on function public.add_gym_comment(uuid, text) to authenticated;
grant execute on function public.delete_gym_comment(uuid) to authenticated;
