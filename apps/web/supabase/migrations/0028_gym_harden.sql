-- 0028_gym_harden.sql — 체육관 보안 강화 (0027 security review 후속, 2026-06-10)
-- H1: 모든 gym 함수의 EXECUTE를 PUBLIC에서 revoke. Postgres는 create function 시 PUBLIC에 execute를
--     자동 부여하고 anon/authenticated가 PUBLIC 멤버라, grant만으론 anon 호출을 못 막는다(내부 auth.uid()
--     가드에만 의존). revoke로 권한을 grant 기반으로 못박는다.
-- M2: 초대코드 8→12 hex (2^32→2^48). anon get_gym_by_invite_code 열거→join→명단 노출 경로를 비현실화.
-- M4: get_my_gym에서 top-level owner_id 제거(UI는 is_owner만 사용) + 멤버 user_id는 관장에게만 노출
--     (강퇴에 필요한 건 관장뿐 — 불필요한 user_id 동(同)테넌트 노출 차단, invite_code 게이트와 동일 방식).
-- L6: gyms.updated_at 트리거 추가(set_updated_at, 다른 테이블과 일관).

-- ── M2: 초대코드 12자 — create_gym / rotate_gym_invite_code 재정의 ──
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
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12));
    begin
      insert into gyms (owner_id, name, invite_code)
      values (v_uid, btrim(p_name), v_code)
      returning * into v_gym;
      exit;
    exception when unique_violation then
      v_gym := null;
    end;
  end loop;
  if v_gym.id is null then raise exception '초대코드 생성에 실패했습니다. 다시 시도해 주세요'; end if;

  insert into gym_members (gym_id, user_id, role) values (v_gym.id, v_uid, 'owner');

  return jsonb_build_object('id', v_gym.id, 'name', v_gym.name, 'invite_code', v_gym.invite_code);
end;
$$;

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
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12));
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

-- ── M4: get_my_gym 재정의 — owner_id 제거 + 멤버 user_id 관장 한정 ──
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
    'invite_code', case when g.owner_id = auth.uid() then g.invite_code else null end,
    'created_at', g.created_at,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        -- 강퇴는 관장만 → user_id도 관장에게만(동테넌트 user_id 불필요 노출 차단).
        'user_id', case when g.owner_id = auth.uid() then m.user_id else null end,
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

-- ── L6: gyms.updated_at 트리거 ──
create trigger gyms_set_updated_at before update on gyms
  for each row execute function set_updated_at();

-- ── H1: PUBLIC에서 execute revoke 후, 의도된 롤에만 재grant ──
revoke execute on function public.current_user_gym_id() from public;
revoke execute on function public.create_gym(text) from public;
revoke execute on function public.join_gym(text) from public;
revoke execute on function public.get_gym_by_invite_code(text) from public;
revoke execute on function public.get_my_gym() from public;
revoke execute on function public.rotate_gym_invite_code() from public;
revoke execute on function public.leave_gym() from public;
revoke execute on function public.remove_gym_member(uuid) from public;
revoke execute on function public.delete_gym() from public;

grant execute on function public.current_user_gym_id() to authenticated;
grant execute on function public.create_gym(text) to authenticated;
grant execute on function public.join_gym(text) to authenticated;
grant execute on function public.get_gym_by_invite_code(text) to anon, authenticated;
grant execute on function public.get_my_gym() to authenticated;
grant execute on function public.rotate_gym_invite_code() to authenticated;
grant execute on function public.leave_gym() to authenticated;
grant execute on function public.remove_gym_member(uuid) to authenticated;
grant execute on function public.delete_gym() to authenticated;
