-- 0035_push_unregister.sql — 로그아웃 시 푸시 토큰 해제 (푸시 위생, 2026-06-11)
-- 문제: 로그아웃해도 push_tokens 행이 남아 마지막 계정으로 푸시가 계속 간다(다른 계정 로그인 전까지).
-- 해제는 본인+해당 토큰만 — 웹이 등록 시 보관해 둔 디바이스 토큰(sessionStorage)을 로그아웃 직전에 넘긴다.
-- push_tokens는 테이블 직접 grant 없음(0026) → register와 대칭으로 RPC 경유.
-- 토큰을 모르면(브라우저/보관 유실) no-op — 그 경우 다음 계정 로그인 시 on-conflict 소유이전이 백스톱.

create or replace function public.unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;

  delete from push_tokens where token = p_token and user_id = auth.uid();
end;
$$;

revoke execute on function public.unregister_push_token(text) from public;
grant execute on function public.unregister_push_token(text) to authenticated;
