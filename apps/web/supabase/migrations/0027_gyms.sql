-- 0027_gyms.sql — 체육관/팀 스페이스 Phase ① (생성+초대+가입, 2026-06-10)
-- 1인용 MatLog → 관장이 체육관을 만들고 관원을 초대하는 다인 구조의 첫 단계(PRD §12 확장).
-- 범위: 소속/명단/초대만. **관원 기록 접근 권한은 만들지 않는다** — 기록 공유는 기존 F11(명시적 링크 공유).
-- 1체육관/계정(gym_members.user_id unique). 모든 변경은 security-definer RPC 경유(comments 0025 패턴).

create table gyms (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  invite_code text not null unique,           -- 짧은 공유 코드(8자 hex 대문자, 회전 가능)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table gym_members (
  gym_id    uuid not null references gyms (id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner','coach','member')),
  joined_at timestamptz not null default now(),
  primary key (gym_id, user_id),
  unique (user_id)                            -- ★ 1체육관/계정 강제
);
create index gym_members_user_idx on gym_members (user_id);

-- ── RLS 재귀 회피 헬퍼 ────────────────────────────────────────────────
-- gym_members 정책에서 gym_members를 다시 조회하면 무한 재귀(Postgres RLS 고전 함정).
-- security-definer로 RLS를 우회해 "내 체육관 id"를 단일 반환(1체육관/계정이라 단일값).
create or replace function public.current_user_gym_id()
returns uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select gym_id from gym_members where user_id = auth.uid() limit 1;
$$;

alter table gyms enable row level security;
alter table gym_members enable row level security;

-- gyms: 내 체육관만 읽기 / 관장만 수정·삭제. insert는 RPC(definer) 경유 → 직접 insert 정책 없음.
create policy gyms_select on gyms for select using (id = public.current_user_gym_id());
create policy gyms_update on gyms for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy gyms_delete on gyms for delete using (owner_id = auth.uid());

-- gym_members: 같은 체육관 멤버끼리 명단 열람 / 본인 탈퇴 / 관장 강퇴. insert는 RPC 경유.
create policy gm_select on gym_members for select using (gym_id = public.current_user_gym_id());
create policy gm_delete_self on gym_members for delete using (user_id = auth.uid());
create policy gm_delete_owner on gym_members for delete
  using (exists (select 1 from gyms g where g.id = gym_members.gym_id and g.owner_id = auth.uid()));

-- ── RPC (전부 security definer; current_user_gym_id로 멤버십 가드) ──────

-- 체육관 생성 — 미소속자만. 고유 초대코드 생성 + gyms + owner 멤버십을 원자적으로.
create or replace function public.create_gym(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_gym  gyms;
  v_code text;
begin
  if v_uid is null then raise exception '로그인이 필요합니다'; end if;
  if public.current_user_gym_id() is not null then
    raise exception '이미 체육관에 소속되어 있습니다';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception '체육관 이름을 입력해 주세요';
  end if;

  for i in 1..10 loop
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    begin
      insert into gyms (owner_id, name, invite_code)
      values (v_uid, btrim(p_name), v_code)
      returning * into v_gym;
      exit;
    exception when unique_violation then
      v_gym := null;  -- 초대코드 충돌 → 재시도
    end;
  end loop;
  if v_gym.id is null then raise exception '초대코드 생성에 실패했습니다. 다시 시도해 주세요'; end if;

  insert into gym_members (gym_id, user_id, role) values (v_gym.id, v_uid, 'owner');

  return jsonb_build_object('id', v_gym.id, 'name', v_gym.name, 'invite_code', v_gym.invite_code);
end;
$$;

-- 초대코드로 가입 — 미소속자만. 반환에 invite_code 미포함(관원에 코드 노출 안 함).
create or replace function public.join_gym(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_gym gyms;
begin
  if v_uid is null then raise exception '로그인이 필요합니다'; end if;
  if public.current_user_gym_id() is not null then
    raise exception '이미 체육관에 소속되어 있습니다';
  end if;

  select * into v_gym from gyms where invite_code = upper(btrim(p_invite_code));
  if v_gym.id is null then raise exception '유효하지 않은 초대코드입니다'; end if;

  insert into gym_members (gym_id, user_id, role) values (v_gym.id, v_uid, 'member');

  return jsonb_build_object('id', v_gym.id, 'name', v_gym.name);
end;
$$;

-- 가입 전 미리보기 — 코드로 체육관명+인원수만(무효 코드는 null 반환, 존재 누설 최소화).
create or replace function public.get_gym_by_invite_code(p_invite_code text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select jsonb_build_object(
    'name', g.name,
    'member_count', (select count(*) from gym_members m where m.gym_id = g.id)
  )
  from gyms g
  where g.invite_code = upper(btrim(p_invite_code));
$$;

-- 내 체육관 + 멤버 명단. 미소속이면 null. invite_code는 관장에게만 노출.
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
    'owner_id', g.owner_id,
    'is_owner', (g.owner_id = auth.uid()),
    'invite_code', case when g.owner_id = auth.uid() then g.invite_code else null end,
    'created_at', g.created_at,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id,
        'name', coalesce(nullif(btrim(p.display_name), ''), '익명'),
        'role', m.role,
        'joined_at', m.joined_at,
        'is_me', (m.user_id = auth.uid())
      ) order by (m.role = 'owner') desc, m.joined_at)
      from gym_members m
      left join profiles p on p.user_id = m.user_id
      where m.gym_id = g.id
    ), '[]'::jsonb)
  )
  from gyms g
  where g.id = public.current_user_gym_id();
$$;

-- 초대코드 회전(관장만).
create or replace function public.rotate_gym_invite_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_gid uuid; v_code text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  select id into v_gid from gyms where id = public.current_user_gym_id() and owner_id = auth.uid();
  if v_gid is null then raise exception '권한이 없습니다'; end if;
  for i in 1..10 loop
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    begin
      update gyms set invite_code = v_code, updated_at = now() where id = v_gid;
      exit;
    exception when unique_violation then v_code := null;
    end;
  end loop;
  if v_code is null then raise exception '코드 생성에 실패했습니다'; end if;
  return v_code;
end;
$$;

-- 탈퇴(관원만; 관장은 체육관 삭제로만).
create or replace function public.leave_gym()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_gid uuid := public.current_user_gym_id();
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if v_gid is null then return false; end if;
  if exists (select 1 from gyms where id = v_gid and owner_id = auth.uid()) then
    raise exception '관장은 탈퇴할 수 없습니다. 체육관을 삭제하세요';
  end if;
  delete from gym_members where user_id = auth.uid();
  return true;
end;
$$;

-- 강퇴(관장만, 본인 제외).
create or replace function public.remove_gym_member(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_gid uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  select id into v_gid from gyms where id = public.current_user_gym_id() and owner_id = auth.uid();
  if v_gid is null then raise exception '권한이 없습니다'; end if;
  if p_user_id = auth.uid() then raise exception '관장 본인은 강퇴할 수 없습니다'; end if;
  delete from gym_members where gym_id = v_gid and user_id = p_user_id;
  return found;
end;
$$;

-- 체육관 삭제(관장만; cascade로 멤버십 정리).
create or replace function public.delete_gym()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_gid uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  select id into v_gid from gyms where id = public.current_user_gym_id() and owner_id = auth.uid();
  if v_gid is null then raise exception '권한이 없습니다'; end if;
  delete from gyms where id = v_gid;
  return true;
end;
$$;

-- 권한: 미리보기는 익명+로그인, 나머지는 로그인(authenticated)만. current_user_gym_id는 RLS 정책서 호출되므로 authenticated 필요.
grant execute on function public.current_user_gym_id() to authenticated;
grant execute on function public.create_gym(text) to authenticated;
grant execute on function public.join_gym(text) to authenticated;
grant execute on function public.get_gym_by_invite_code(text) to anon, authenticated;
grant execute on function public.get_my_gym() to authenticated;
grant execute on function public.rotate_gym_invite_code() to authenticated;
grant execute on function public.leave_gym() to authenticated;
grant execute on function public.remove_gym_member(uuid) to authenticated;
grant execute on function public.delete_gym() to authenticated;
