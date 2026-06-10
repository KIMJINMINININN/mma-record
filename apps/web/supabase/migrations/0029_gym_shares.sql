-- 0029_gym_shares.sql — 체육관 Phase ②-a: 관원→체육관 공유 + 코치 피드(요약) (2026-06-10)
-- 관원이 본인 세션/기술을 "체육관에 공유" → 관장 피드에 노출(관원은 본인 것만). 코멘트는 2c.
-- 가시성: {공유 관원, 관장}만(동료 관원 비노출). F11 공개 토큰 미재사용 — gym 권한 격리.
-- 접근은 전부 security-definer RPC 경유(0027/0025 패턴) + PUBLIC revoke(0028 H1 교훈).
-- SSoT: docs/issue/20260610/gym-phase2-plan.md

create table gym_shares (
  id            uuid primary key default gen_random_uuid(),
  gym_id        uuid not null references gyms (id) on delete cascade,
  member_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  resource_type text not null check (resource_type in ('session', 'technique')),
  resource_id   uuid not null,                          -- sessions.id | techniques.id (소유=member_id, RPC서 검증)
  created_at    timestamptz not null default now(),
  unique (member_id, resource_type, resource_id)        -- 같은 항목 중복 공유 방지
);
create index gym_shares_gym_idx on gym_shares (gym_id, created_at);

alter table gym_shares enable row level security;
-- 백스톱(접근은 RPC 경유): 공유 관원 본인 OR 체육관 관장. insert는 RPC(definer) 경유 → insert 정책 없음.
create policy gym_shares_select on gym_shares for select using (
  member_id = auth.uid()
  or auth.uid() = (select owner_id from gyms g where g.id = gym_shares.gym_id)
);
create policy gym_shares_delete_self on gym_shares for delete using (member_id = auth.uid());
create policy gym_shares_delete_owner on gym_shares for delete using (
  auth.uid() = (select owner_id from gyms g where g.id = gym_shares.gym_id)
);

-- ── RPC ────────────────────────────────────────────────────────────

-- 본인 소유 세션/기술을 체육관에 공유(idempotent). 소속 + 소유 검증.
create or replace function public.share_to_gym(p_resource_type text, p_resource_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_gid uuid := public.current_user_gym_id(); v_owns boolean;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if v_gid is null then raise exception '체육관에 소속되어 있지 않습니다'; end if;
  if p_resource_type not in ('session', 'technique') then raise exception '잘못된 공유 종류입니다'; end if;

  if p_resource_type = 'session' then
    select exists (select 1 from sessions where id = p_resource_id and user_id = auth.uid()) into v_owns;
  else
    select exists (select 1 from techniques where id = p_resource_id and user_id = auth.uid()) into v_owns;
  end if;
  if not v_owns then raise exception '본인 기록만 공유할 수 있습니다'; end if;

  insert into gym_shares (gym_id, member_id, resource_type, resource_id)
  values (v_gid, auth.uid(), p_resource_type, p_resource_id)
  on conflict (member_id, resource_type, resource_id) do nothing;
  return true;
end;
$$;

-- 공유 해제(본인 것만).
create or replace function public.unshare_from_gym(p_resource_type text, p_resource_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  delete from gym_shares
  where member_id = auth.uid() and resource_type = p_resource_type and resource_id = p_resource_id;
  return found;
end;
$$;

-- 내가 공유한 resource_id 집합(토글 상태용). 미소속/없음 → [].
create or replace function public.list_my_gym_shares(p_resource_type text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce(jsonb_agg(resource_id), '[]'::jsonb)
  from gym_shares
  where member_id = auth.uid() and resource_type = p_resource_type;
$$;

-- 체육관 피드: 관장=체육관 전체 / 관원=본인 공유. 각 항목 요약(공유자명·타입·제목·부제·최신순).
-- 원본(세션/기술) 삭제 시 missing=true(상세 불가, 목록엔 표시).
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
      and (
        gs.member_id = auth.uid()
        or auth.uid() = (select owner_id from gyms g where g.id = gs.gym_id)
      )
  ) feed;
$$;

-- 권한: 전부 로그인 필요(anon 없음). PUBLIC revoke 후 authenticated에만 grant(0028 H1).
revoke execute on function public.share_to_gym(text, uuid) from public;
revoke execute on function public.unshare_from_gym(text, uuid) from public;
revoke execute on function public.list_my_gym_shares(text) from public;
revoke execute on function public.get_gym_feed() from public;

grant execute on function public.share_to_gym(text, uuid) to authenticated;
grant execute on function public.unshare_from_gym(text, uuid) to authenticated;
grant execute on function public.list_my_gym_shares(text) to authenticated;
grant execute on function public.get_gym_feed() to authenticated;
