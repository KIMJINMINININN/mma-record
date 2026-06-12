-- 0039_list_my_shares_visibility.sql — list_my_gym_shares가 공유 범위·수신자도 반환 (2026-06-12)
-- 0038 공유 범위의 UX 마무리: 공유중 상태에서 "현재 범위"를 보여주고 인라인으로 바꾸려면,
-- 토글이 내 공유의 visibility(+specific 수신자)를 알아야 한다. 기존엔 resource_id만 반환했음.
-- 반환 타입은 jsonb 그대로(내용만 객체 배열로) → create or replace 가능(drop 불필요).
-- 범위 변경 자체는 share_to_gym이 on-conflict update라 재호출로 처리(RPC 추가 없음).

create or replace function public.list_my_gym_shares(p_resource_type text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'resource_id', gs.resource_id,
    'visibility', gs.visibility,
    'recipient_ids', (
      select coalesce(jsonb_agg(r.recipient_user_id), '[]'::jsonb)
      from gym_share_recipients r where r.gym_share_id = gs.id
    )
  )), '[]'::jsonb)
  from gym_shares gs
  where gs.member_id = auth.uid() and gs.resource_type = p_resource_type;
$$;

-- 위생: PUBLIC 기본 제거 + authenticated만(0029엔 revoke가 없었음 — 함수 손대는 김에 정리).
revoke execute on function public.list_my_gym_shares(text) from public;
grant execute on function public.list_my_gym_shares(text) to authenticated;
