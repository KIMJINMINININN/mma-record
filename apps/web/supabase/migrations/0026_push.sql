-- 0026_push.sql — 서버 푸시: "내 공유에 코멘트 → 소유자에게 알림" (F11 후속, 서버 푸시, 2026-06-08)
-- 0025_comments.sql 의 코멘트에 이어, 코멘트가 달리면 공유 **소유자**에게 푸시 알림을 보낸다.
-- push_tokens(디바이스 Expo 토큰, 본인만 관리) + comments insert 트리거(pg_net로 Expo Push API 비동기 호출).
-- Edge Function 없이 트리거에서 직접 호출 — 토큰이 곧 주소라 별도 발송 키 불필요(Expo Push).
-- 휴면: EAS 빌드 + 푸시 자격(FCM/APNs) + 실기기 토큰 등록 전까지는 push_tokens가 비어 루프 0회 = no-op.
-- 토큰 등록은 register_push_token RPC 경유(테이블 직접 grant 안 함) — get_shared_*/comments 패턴 그대로.

-- push_tokens — 디바이스 Expo 푸시 토큰(유저당 N개). 본인만 관리(RLS).
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,           -- ExpoPushToken[...] — 디바이스 1개 = 토큰 1개(재설치/계정이동 시 on conflict로 소유 이전)
  platform text,                         -- 'ios' | 'android' (진단용)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on push_tokens (user_id);
alter table push_tokens enable row level security;
create policy push_tokens_owner_all on push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 토큰 등록/갱신(로그인 필수) — anon grant 없음으로 비로그인 호출 자체를 막고, 함수 안에서도 한 번 더 가드.
-- 디바이스 토큰은 유일(token unique)하므로, 재설치/계정이동으로 같은 토큰이 다른 유저에게 오면 on conflict로 소유 이전.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;

  insert into push_tokens (user_id, token, platform)
  values (auth.uid(), p_token, p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

-- pg_net(Supabase 기본 제공) — 트리거에서 Expo Push API를 비동기 fire-and-forget 호출(insert 안 막음).
create extension if not exists pg_net with schema extensions;

-- 코멘트 insert → 공유 소유자에게 푸시(본인 코멘트는 스킵). 소유자의 push_tokens를 읽어야 하므로(작성자≠소유자)
-- security definer(RLS 우회). 토큰 없으면 루프 0회 = no-op(휴면). Expo Push API는 토큰이 곧 주소라 API 키 불필요.
create or replace function notify_share_owner_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_owner uuid;
  v_rec record;
begin
  select owner_id into v_owner from shares where id = NEW.share_id;
  if v_owner is null or v_owner = NEW.author_id then
    return NEW;  -- 공유 없음 or 본인 코멘트 → 알림 스킵
  end if;
  for v_rec in select token from push_tokens where user_id = v_owner loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'to', v_rec.token,
        'title', '새 코멘트',
        'body', left(NEW.body, 100),
        'data', jsonb_build_object('shareId', NEW.share_id)
      )
    );
  end loop;
  return NEW;
end;
$$;

create trigger comments_notify_owner
  after insert on comments
  for each row execute function notify_share_owner_on_comment();

-- 등록은 로그인(authenticated)만 — anon 미부여. 테이블 직접 grant는 하지 않는다(RLS 정책 + RPC 경유).
grant execute on function public.register_push_token(text, text) to authenticated;
