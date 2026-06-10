-- 0032_gym_join_requests.sql — 체육관 Phase ③: 가입 승인제 (2026-06-10, 보안리뷰 M3 후속)
-- 코드 입력 = 즉시 가입 → **가입 요청** 후 staff(관장/코치) 승인 시 멤버십 생성.
-- 별도 gym_join_requests 테이블(멤버십 의미 불변). 1요청/계정. 접근은 security-definer RPC + PUBLIC revoke.
-- SSoT: docs/issue/20260610/gym-phase2-plan.md

create table gym_join_requests (
  id         uuid primary key default gen_random_uuid(),
  gym_id     uuid not null references gyms (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id)                            -- 1 요청/계정
);
create index gym_join_requests_gym_idx on gym_join_requests (gym_id, created_at);

alter table gym_join_requests enable row level security;
-- 백스톱: 요청자 본인 OR staff. insert/delete는 RPC(definer).
create policy gjr_select on gym_join_requests for select using (
  user_id = auth.uid() or public.is_gym_staff(gym_id)
);
create policy gjr_delete_self on gym_join_requests for delete using (user_id = auth.uid());
create policy gjr_delete_staff on gym_join_requests for delete using (public.is_gym_staff(gym_id));

-- 가입 요청(미소속 + 미요청자만). join_gym 대체.
create or replace function public.request_join_gym(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_gym gyms;
begin
  if v_uid is null then raise exception '로그인이 필요합니다'; end if;
  if public.current_user_gym_id() is not null then raise exception '이미 체육관에 소속되어 있습니다'; end if;
  if exists (select 1 from gym_join_requests where user_id = v_uid) then
    raise exception '이미 가입 요청을 보냈습니다';
  end if;
  select * into v_gym from gyms where invite_code = upper(btrim(p_invite_code));
  if v_gym.id is null then raise exception '유효하지 않은 초대코드입니다'; end if;
  insert into gym_join_requests (gym_id, user_id) values (v_gym.id, v_uid);
  return jsonb_build_object('name', v_gym.name);
end;
$$;

-- 내 대기 중 요청(없으면 null) — 미소속 화면의 "요청 대기 중" 표시용.
create or replace function public.get_my_pending_request()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select jsonb_build_object('name', g.name, 'requested_at', r.created_at)
  from gym_join_requests r join gyms g on g.id = r.gym_id
  where r.user_id = auth.uid();
$$;

-- 요청 취소(본인).
create or replace function public.cancel_join_request()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  delete from gym_join_requests where user_id = auth.uid();
  return found;
end;
$$;

-- 가입 요청 목록(staff) — 이름·요청시각.
create or replace function public.list_gym_join_requests()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', r.user_id,
    'name', coalesce(nullif(btrim(p.display_name), ''), '익명'),
    'requested_at', r.created_at
  ) order by r.created_at), '[]'::jsonb)
  from gym_join_requests r
  left join profiles p on p.user_id = r.user_id
  where r.gym_id = public.current_user_gym_id()
    and public.is_gym_staff(public.current_user_gym_id());
$$;

-- 요청 승인(staff) — 멤버십 생성 + 요청 삭제. 이미 타 체육관 소속이면 unique 위반 → 정리+안내.
create or replace function public.approve_gym_join_request(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_gid uuid := public.current_user_gym_id();
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if not public.is_gym_staff(v_gid) then raise exception '권한이 없습니다'; end if;
  if not exists (select 1 from gym_join_requests where user_id = p_user_id and gym_id = v_gid) then
    raise exception '가입 요청이 없습니다';
  end if;
  begin
    insert into gym_members (gym_id, user_id, role) values (v_gid, p_user_id, 'member');
  exception when unique_violation then
    delete from gym_join_requests where user_id = p_user_id;
    raise exception '이미 다른 체육관에 소속된 사용자입니다';
  end;
  delete from gym_join_requests where user_id = p_user_id;
  return true;
end;
$$;

-- 요청 거절(staff).
create or replace function public.reject_gym_join_request(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_gid uuid := public.current_user_gym_id();
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if not public.is_gym_staff(v_gid) then raise exception '권한이 없습니다'; end if;
  delete from gym_join_requests where user_id = p_user_id and gym_id = v_gid;
  return found;
end;
$$;

-- get_my_gym: pending_count(staff에게만) 추가.
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
    'pending_count', case when public.is_gym_staff(g.id)
      then (select count(*) from gym_join_requests r where r.gym_id = g.id) else 0 end,
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

-- create_gym: 대기 중 요청이 있으면 거부(취소 후 생성).
create or replace function public.create_gym(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_gym gyms; v_code text;
begin
  if v_uid is null then raise exception '로그인이 필요합니다'; end if;
  if public.current_user_gym_id() is not null then raise exception '이미 체육관에 소속되어 있습니다'; end if;
  if exists (select 1 from gym_join_requests where user_id = v_uid) then
    raise exception '가입 요청을 취소한 뒤 체육관을 만들 수 있습니다';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) = 0 then raise exception '체육관 이름을 입력해 주세요'; end if;
  for i in 1..10 loop
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12));
    begin
      insert into gyms (owner_id, name, invite_code) values (v_uid, btrim(p_name), v_code)
      returning * into v_gym;
      exit;
    exception when unique_violation then v_gym := null;
    end;
  end loop;
  if v_gym.id is null then raise exception '초대코드 생성에 실패했습니다. 다시 시도해 주세요'; end if;
  insert into gym_members (gym_id, user_id, role) values (v_gym.id, v_uid, 'owner');
  return jsonb_build_object('id', v_gym.id, 'name', v_gym.name, 'invite_code', v_gym.invite_code);
end;
$$;

-- 즉시 가입(join_gym)은 승인제로 대체 → 제거.
drop function if exists public.join_gym(text);

-- 권한.
revoke execute on function public.request_join_gym(text) from public;
revoke execute on function public.get_my_pending_request() from public;
revoke execute on function public.cancel_join_request() from public;
revoke execute on function public.list_gym_join_requests() from public;
revoke execute on function public.approve_gym_join_request(uuid) from public;
revoke execute on function public.reject_gym_join_request(uuid) from public;
grant execute on function public.request_join_gym(text) to authenticated;
grant execute on function public.get_my_pending_request() to authenticated;
grant execute on function public.cancel_join_request() to authenticated;
grant execute on function public.list_gym_join_requests() to authenticated;
grant execute on function public.approve_gym_join_request(uuid) to authenticated;
grant execute on function public.reject_gym_join_request(uuid) to authenticated;
