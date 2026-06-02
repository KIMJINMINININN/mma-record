-- 0003_profiles.sql — 프로필 + 공통 updated_at 트리거 함수 + 가입 트리거

-- 공통 updated_at 자동 갱신 함수 (모든 테이블의 updated_at 트리거가 재사용)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Asia/Seoul',
  visibility visibility not null default 'private',   -- 공유 대비 시드
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "profiles_select_own" on profiles for select using (auth.uid() = user_id);
create policy "profiles_update_own" on profiles for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- INSERT 정책 없음 → handle_new_user() (security definer)만 INSERT
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();

create function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (user_id, display_name, timezone)
  values (new.id, '', 'Asia/Seoul')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
-- 0015에서 프리셋 기술 시드 호출까지 포함해 재정의됨

create trigger on_auth_user_created
  after insert on auth.users for each row
  execute function public.handle_new_user();
