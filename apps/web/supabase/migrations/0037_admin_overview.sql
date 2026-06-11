-- 0037_admin_overview.sql — 운영 현황 대시보드(/admin) 백엔드 (2026-06-11)
-- 운영자(사장님)가 전체 운영 숫자를 한눈에 보는 읽기 전용 대시보드. Supabase 콘솔이 raw 테이블만
-- 보여주는 걸 요약 집계로 대신한다. 전역 admin 역할이 없었으므로 profiles.is_admin 플래그를 신설한다.
--
-- 보안: 집계는 다른 유저의 행까지 세야 해서 RLS를 우회하는 security definer RPC로만 노출한다.
-- **개인 데이터는 한 건도 반환하지 않는다 — 카운트(숫자)만.** 호출자가 admin이 아니면 즉시 거부한다.
-- is_admin은 본인도 못 바꾼다(profiles_update_own 정책이 컬럼 화이트리스트는 없지만, 이 컬럼은
-- 운영자가 service-key/SQL로만 켜고 일반 UPDATE 경로는 display_name/timezone/reminder만 보냄 —
-- 그래도 방어적으로, 권한 상승을 막는 트리거를 둔다).

-- 전역 운영자 플래그 — 기본 false. 켜는 건 service-key/SQL 운영 작업으로만.
alter table profiles add column if not exists is_admin boolean not null default false;

-- 권한 상승 차단: 일반 UPDATE로 is_admin을 바꾸지 못하게 한다(현재 값 유지 강제).
-- service_role(키)·security definer 함수는 RLS/이 트리거의 영향을 받지 않으므로 운영 토글은 그대로 가능.
create or replace function public.prevent_is_admin_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- 호출자가 service_role(운영 키)이면 자유롭게 변경 허용. 그 외(authenticated 유저)는 기존 값 고정.
  if current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' then
    return NEW;
  end if;
  NEW.is_admin := OLD.is_admin;
  return NEW;
end;
$$;

create trigger profiles_guard_is_admin
  before update on profiles
  for each row execute function public.prevent_is_admin_self_escalation();

-- 운영자 판별(내부 전용) — 호출자가 admin인가. get_admin_overview가 가드로 쓴다.
create or replace function public.is_app_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce((select is_admin from profiles where user_id = auth.uid()), false);
$$;

-- 운영 현황 집계 — admin만. 개인 데이터 없이 카운트만 jsonb로 반환.
--   회원(총/이번 주 신규) · 세션(총/최근 7일 trained_on) · 기술(프리셋 포함 총계) ·
--   체육관(수/멤버) · 공유 · 코멘트 · 활성 디바이스(push_tokens).
create or replace function public.get_admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare result jsonb;
begin
  if not public.is_app_admin() then
    raise exception '권한이 없습니다';
  end if;
  select jsonb_build_object(
    'members_total',     (select count(*) from profiles),
    'members_new_week',  (select count(*) from profiles where created_at >= date_trunc('week', now())),
    'sessions_total',    (select count(*) from sessions),
    'sessions_week',     (select count(*) from sessions where trained_on >= current_date - 6),
    'techniques_total',  (select count(*) from techniques),
    'gyms_total',        (select count(*) from gyms),
    'gym_members_total', (select count(*) from gym_members),
    'shares_total',      (select count(*) from shares),
    'comments_total',    (select count(*) from comments),
    'active_devices',    (select count(*) from push_tokens),
    'generated_at',      now()
  ) into result;
  return result;
end;
$$;

-- 권한: 전부 로그인 필요(함수 내부 is_app_admin 가드가 진짜 게이트). PUBLIC 기본 제거 + authenticated만.
-- is_app_admin은 내부 헬퍼라 grant 안 함(definer 체인으로 get_admin_overview가 호출).
revoke execute on function public.is_app_admin() from public;
revoke execute on function public.get_admin_overview() from public;
grant execute on function public.get_admin_overview() to authenticated;
