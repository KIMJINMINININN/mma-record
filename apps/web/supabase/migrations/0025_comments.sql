-- 0025_comments.sql — 공유 페이지 코멘트 (F11 후속, 코멘트, 2026-06-08)
-- 0022_shares.sql / 0024_share_technique.sql 의 공유(세션·기술 공통)에 **코멘트**를 단다.
-- 코멘트는 share 에 붙으므로(resource_type 무관) 세션·기술 어느 공유든 동일하게 동작한다.
-- 읽기=누구나(익명 포함), 쓰기=로그인한 MatLog 유저만, 삭제=작성자 OR 공유 소유자.
-- 모든 접근은 security-definer RPC 경유 — 테이블 직접 grant 하지 않는다(get_shared_* 패턴 그대로).

create table comments (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references shares (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_share_idx on comments (share_id, created_at);

alter table comments enable row level security;
-- 직접 테이블 접근은 grant하지 않는다 — 읽기(anon)·쓰기(로그인)·삭제는 모두 아래 security-definer RPC 경유.
-- RLS 정책은 백스톱(혹시 직접 접근 시 작성자/공유 소유자만).
create policy comments_select_owner_or_author on comments
  for select using (
    auth.uid() = author_id
    or auth.uid() = (select owner_id from shares where shares.id = comments.share_id)
  );
create policy comments_delete_owner_or_author on comments
  for delete using (
    auth.uid() = author_id
    or auth.uid() = (select owner_id from shares where shares.id = comments.share_id)
  );

-- 토큰으로 공유된 자원의 코멘트를 익명 읽기(읽기 전용 jsonb 배열, 오래된→최신).
-- 토큰이 없거나 코멘트가 없으면 '[]' — 자원 존재 여부를 누설하지 않는다(get_shared_* 동일 철학).
-- author_name 은 profiles.display_name(공백이면 '익명'). can_delete 는 호출자(로그인 시) 권한.
create or replace function public.get_shared_comments(p_token text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'author_name', coalesce(nullif(btrim(p.display_name), ''), '익명'),
    'body', c.body,
    'created_at', c.created_at,
    'can_delete', (auth.uid() is not null and (auth.uid() = c.author_id or auth.uid() = sh.owner_id))
  ) order by c.created_at), '[]'::jsonb)
  from shares sh
  join comments c on c.share_id = sh.id
  left join profiles p on p.user_id = c.author_id
  where sh.token = p_token;
$$;

-- 코멘트 작성(로그인 필수) — anon grant 없음으로 비로그인 호출 자체를 막고, 함수 안에서도 한 번 더 가드.
-- 토큰→share_id 해석(없으면 에러), body 는 trim 후 insert(테이블 check 가 1..2000 강제).
-- 반환은 get_shared_comments 항목과 동일 형태(작성자 본인이므로 can_delete=true).
create or replace function public.add_shared_comment(p_token text, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_share_id uuid;
  v_row comments;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;

  select sh.id into v_share_id from shares sh where sh.token = p_token;
  if v_share_id is null then
    raise exception '존재하지 않는 공유입니다';
  end if;

  insert into comments (share_id, author_id, body)
  values (v_share_id, auth.uid(), btrim(p_body))
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

-- 코멘트 삭제(로그인 필수) — 작성자 OR 공유 소유자만. anon grant 없음 + 함수 안에서도 가드.
-- 권한 없거나 없는 id 면 0행 삭제 → found=false 반환(예외 대신 불리언으로 호출부가 분기).
create or replace function public.delete_shared_comment(p_comment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;

  delete from comments c
  using shares sh
  where c.id = p_comment_id
    and c.share_id = sh.id
    and (c.author_id = auth.uid() or sh.owner_id = auth.uid());

  return found;
end;
$$;

-- 읽기는 익명+로그인, 쓰기/삭제는 로그인(authenticated)만 — anon 미부여로 로그인 강제.
grant execute on function public.get_shared_comments(text) to anon, authenticated;
grant execute on function public.add_shared_comment(text, text) to authenticated;
grant execute on function public.delete_shared_comment(uuid) to authenticated;
