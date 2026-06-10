-- 0031_gym_coach_role.sql — 체육관 Phase ③: coach 역할 분리 (2026-06-10)
-- 관장이 관원을 코치로 승격/강등. staff(=관장 OR 코치)는 피드 전체 열람·상세·코멘트·코멘트 삭제(모더레이션).
-- 관리(코드 회전·강퇴·체육관 삭제·역할 변경)는 여전히 관장만. 권한판을 is_gym_staff()로 일원화.
-- 전부 security definer + PUBLIC revoke→authenticated(헬퍼는 내부 전용). SSoT: docs/issue/20260610/gym-phase2-plan.md

-- staff 판별(내부 전용): 호출자가 해당 체육관의 owner 또는 coach 멤버인가.
create or replace function public.is_gym_staff(p_gym_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from gym_members m
    where m.gym_id = p_gym_id and m.user_id = auth.uid() and m.role in ('owner', 'coach')
  );
$$;

-- 역할 변경(관장만; coach↔member, owner는 불변). 본인/owner 대상 금지.
create or replace function public.set_gym_member_role(p_user_id uuid, p_role text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_gid uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if p_role not in ('coach', 'member') then raise exception '잘못된 역할입니다'; end if;
  select id into v_gid from gyms where id = public.current_user_gym_id() and owner_id = auth.uid();
  if v_gid is null then raise exception '권한이 없습니다'; end if;
  if p_user_id = auth.uid() then raise exception '관장 본인 역할은 바꿀 수 없습니다'; end if;
  update gym_members set role = p_role
    where gym_id = v_gid and user_id = p_user_id and role <> 'owner';
  return found;
end;
$$;

-- can_access_gym_share: 공유 관원 OR staff(관장/코치).
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
      and (gs.member_id = auth.uid() or public.is_gym_staff(gs.gym_id))
  );
$$;

-- get_my_gym: is_staff 추가(코치도 피드 전체 열람 분기). invite_code는 여전히 관장만.
create or replace function public.get_my_gym()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'is_owner', (g.owner_id = auth.uid()),
    'is_staff', public.is_gym_staff(g.id),
    'invite_code', case when g.owner_id = auth.uid() then g.invite_code else null end,
    'created_at', g.created_at,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', case when g.owner_id = auth.uid() then m.user_id else null end,
        'name', coalesce(nullif(btrim(p.display_name), ''), '익명'),
        'role', m.role,
        'joined_at', m.joined_at,
        'is_me', (m.user_id = auth.uid())
      ) order by (m.role = 'owner') desc, (m.role = 'coach') desc, m.joined_at)
      from gym_members m
      left join profiles p on p.user_id = m.user_id
      where m.gym_id = g.id
    ), '[]'::jsonb)
  )
  from gyms g
  where g.id = public.current_user_gym_id();
$$;

-- get_gym_feed: staff=전체 / 그 외=본인.
create or replace function public.get_gym_feed()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce(jsonb_agg(item order by ord desc), '[]'::jsonb)
  from (
    select
      gs.created_at as ord,
      jsonb_build_object(
        'id', gs.id,
        'resource_type', gs.resource_type,
        'resource_id', gs.resource_id,
        'member_name', coalesce(nullif(btrim(p.display_name), ''), '익명'),
        'is_mine', (gs.member_id = auth.uid()),
        'shared_at', gs.created_at,
        'title', case gs.resource_type
          when 'session' then coalesce(nullif(s.gym, ''), to_char(s.trained_on, 'YYYY-MM-DD'), '훈련 세션')
          when 'technique' then coalesce(t.name, '기술')
          else '항목' end,
        'subtitle', case gs.resource_type
          when 'session' then to_char(s.trained_on, 'YYYY-MM-DD')
          when 'technique' then t.discipline::text
          else null end,
        'missing', case gs.resource_type
          when 'session' then (s.id is null)
          when 'technique' then (t.id is null)
          else true end
      ) as item
    from gym_shares gs
    left join profiles p on p.user_id = gs.member_id
    left join sessions s on gs.resource_type = 'session' and s.id = gs.resource_id
    left join techniques t on gs.resource_type = 'technique' and t.id = gs.resource_id
    where gs.gym_id = public.current_user_gym_id()
      and (gs.member_id = auth.uid() or public.is_gym_staff(gs.gym_id))
  ) feed;
$$;

-- get_gym_comments: can_delete = 작성자 OR staff.
create or replace function public.get_gym_comments(p_gym_share_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare v_is_staff boolean;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if not public.can_access_gym_share(p_gym_share_id) then raise exception '권한이 없습니다'; end if;
  select public.is_gym_staff(gs.gym_id) into v_is_staff from gym_shares gs where gs.id = p_gym_share_id;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'author_name', coalesce(nullif(btrim(p.display_name), ''), '익명'),
      'body', c.body,
      'created_at', c.created_at,
      'can_delete', (c.author_id = auth.uid() or coalesce(v_is_staff, false))
    ) order by c.created_at), '[]'::jsonb)
    from gym_comments c
    left join profiles p on p.user_id = c.author_id
    where c.gym_share_id = p_gym_share_id
  );
end;
$$;

-- delete_gym_comment: 작성자 OR staff.
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
    and (c.author_id = auth.uid() or public.is_gym_staff(gs.gym_id));
  return found;
end;
$$;

-- 백스톱 RLS도 staff로 일원화(직접 테이블 접근 시 코치 포함).
drop policy gym_shares_select on gym_shares;
create policy gym_shares_select on gym_shares for select using (
  member_id = auth.uid() or public.is_gym_staff(gym_id)
);
drop policy gym_comments_select on gym_comments;
create policy gym_comments_select on gym_comments for select using (
  exists (select 1 from gym_shares gs where gs.id = gym_comments.gym_share_id
    and (gs.member_id = auth.uid() or public.is_gym_staff(gs.gym_id)))
);
drop policy gym_comments_delete on gym_comments;
create policy gym_comments_delete on gym_comments for delete using (
  author_id = auth.uid()
  or exists (select 1 from gym_shares gs where gs.id = gym_comments.gym_share_id
    and public.is_gym_staff(gs.gym_id))
);

-- 권한.
revoke execute on function public.is_gym_staff(uuid) from public;
revoke execute on function public.set_gym_member_role(uuid, text) from public;
grant execute on function public.set_gym_member_role(uuid, text) to authenticated;
