-- 0038_gym_share_visibility.sql — 체육관 공유 범위(visibility) (2026-06-12)
-- 공유할 때 "누가 볼지"를 고른다: coaches(기본·현재 동작) / everyone(전원=피어 피드) / owner(관장만) /
-- specific(선택한 멤버만). 비전: 관원끼리 영상 확인·공유(everyone) + 민망하면 코치/관장에게만.
-- 정책: owner·specific은 **진짜 비공개** — 관장도 모더레이션 명목으로 못 본다(신고 기능은 후속).
--
-- 핵심 설계: 권한 판정을 can_access_gym_share() 한 곳에 모은다 → 상세(get_gym_shared_detail)·
-- 코멘트(get/add/delete_gym_comment)가 이미 이 함수에 의존하므로 자동 반영. 피드(get_gym_feed)도
-- 같은 함수를 재사용해 일관성 보장(체육관/멤버/공유 수가 작아 row별 호출 성능 무관).
-- 무중단: 기존 공유 전부 'coaches'(현재 동작)로 백필 + share_to_gym에 default 부여(2-arg 호출 하위호환).

-- 공유 범위 enum.
create type gym_share_visibility as enum ('coaches', 'everyone', 'owner', 'specific');

-- gym_shares에 범위 컬럼(기본 coaches = 기존 동작). 기존 행은 default로 자동 'coaches'.
alter table gym_shares add column visibility gym_share_visibility not null default 'coaches';

-- specific 공유의 수신자(공유 1건 ↔ 멤버 N명). 테이블 직접 grant 없음 — definer RPC만 접근(RLS 백스톱).
create table gym_share_recipients (
  gym_share_id     uuid not null references gym_shares (id) on delete cascade,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  primary key (gym_share_id, recipient_user_id)
);
alter table gym_share_recipients enable row level security;
-- 정책 없음(전면 차단) — security definer 함수만 읽고 쓴다.

-- ── 권한 판정 단일 출처: 이 gym_share를 볼 수 있나 (visibility별) ──
-- 공유자 본인은 항상. 그 외: coaches→staff / everyone→같은 체육관 멤버 / owner→관장 / specific→수신자.
create or replace function public.can_access_gym_share(p_gym_share_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from gym_shares gs
    where gs.id = p_gym_share_id
      and (
        gs.member_id = auth.uid()  -- 공유한 본인
        or case gs.visibility
          when 'coaches'  then public.is_gym_staff(gs.gym_id)
          when 'everyone' then gs.gym_id = public.current_user_gym_id()  -- 같은 체육관 멤버 전원
          when 'owner'    then auth.uid() = (select owner_id from gyms g where g.id = gs.gym_id)
          when 'specific' then exists (
            select 1 from gym_share_recipients r
            where r.gym_share_id = gs.id and r.recipient_user_id = auth.uid()
          )
        end
      )
  );
$$;

-- ── 피드: 같은 체육관 + 접근 가능한 공유만(can_access_gym_share 재사용 = 권한 일관성) ──
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
        'visibility', gs.visibility,
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
      and public.can_access_gym_share(gs.id)
  ) feed;
$$;

-- ── 공유(범위 + specific 수신자). 기존 2-arg 호출은 default로 'coaches' 유지(무중단) ──
-- 기존 share_to_gym(text, uuid)를 drop하고 4-arg로 재정의(인자 추가는 시그니처 변경이라 drop 필요).
drop function if exists public.share_to_gym(text, uuid);
create or replace function public.share_to_gym(
  p_resource_type text,
  p_resource_id uuid,
  p_visibility gym_share_visibility default 'coaches',
  p_recipient_ids uuid[] default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_gid uuid := public.current_user_gym_id(); v_owns boolean; v_share_id uuid;
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

  -- 재공유 시 범위 갱신(설정 변경 허용). returning으로 share id 확보.
  insert into gym_shares (gym_id, member_id, resource_type, resource_id, visibility)
  values (v_gid, auth.uid(), p_resource_type, p_resource_id, p_visibility)
  on conflict (member_id, resource_type, resource_id)
    do update set visibility = excluded.visibility
  returning id into v_share_id;

  -- 수신자 재설정 — specific이면 같은 체육관 멤버만 담고, 아니면 비운다(범위 바꾸면 잔재 제거).
  delete from gym_share_recipients where gym_share_id = v_share_id;
  if p_visibility = 'specific' and p_recipient_ids is not null then
    insert into gym_share_recipients (gym_share_id, recipient_user_id)
    select v_share_id, m.user_id
    from gym_members m
    where m.gym_id = v_gid
      and m.user_id = any(p_recipient_ids)
      and m.user_id <> auth.uid();  -- 본인은 항상 접근 가능하므로 명단서 제외
  end if;

  return true;
end;
$$;

-- ── 코멘트 푸시 트리거(0033) 갱신: 공유 범위에 따라 알릴 대상이 달라짐 ──
-- 기존엔 "공유한 관원에게" 푸시. 이제 코멘트 작성자를 뺀 **접근 권한자 전원**에게 알린다
-- (everyone이면 관원들끼리도, coaches면 관원↔코치). 본인 코멘트는 스킵. push_tokens 없으면 no-op.
create or replace function notify_gym_share_member_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_gs gym_shares;
  v_author text;
  v_rec record;
begin
  select * into v_gs from gym_shares gs where gs.id = NEW.gym_share_id;
  if v_gs.id is null then return NEW; end if;
  select coalesce(nullif(btrim(display_name), ''), '코치') into v_author
    from profiles where user_id = NEW.author_id;

  -- 알림 대상: 공유자 + (범위별 접근자). 코멘트 작성자 본인은 제외. 토큰 있는 사람만 실제 발송.
  for v_rec in
    select distinct pt.token
    from (
      select v_gs.member_id as uid                                  -- 공유자
      union
      select m.user_id from gym_members m                            -- 범위별 접근자
       where m.gym_id = v_gs.gym_id
         and case v_gs.visibility
           when 'coaches'  then m.role in ('owner', 'coach')
           when 'everyone' then true
           when 'owner'    then m.role = 'owner'
           when 'specific' then m.user_id in (
             select r.recipient_user_id from gym_share_recipients r where r.gym_share_id = v_gs.id
           )
         end
    ) targets
    join push_tokens pt on pt.user_id = targets.uid
    where targets.uid <> NEW.author_id                               -- 본인 코멘트 스킵
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'to', v_rec.token,
        'title', '체육관 피드백',
        'body', coalesce(v_author, '코치') || ': ' || left(NEW.body, 80),
        'data', jsonb_build_object('gymShareId', NEW.gym_share_id, 'url', '/gym/feed/' || NEW.gym_share_id::text)
      )
    );
  end loop;
  return NEW;
end;
$$;

-- 권한: 새 share_to_gym(4-arg) 재grant(drop으로 사라짐) + PUBLIC revoke. can_access_gym_share는 내부 헬퍼(grant 없음).
revoke execute on function public.share_to_gym(text, uuid, gym_share_visibility, uuid[]) from public;
grant execute on function public.share_to_gym(text, uuid, gym_share_visibility, uuid[]) to authenticated;
revoke execute on function public.can_access_gym_share(uuid) from public;
revoke execute on function public.get_gym_feed() from public;
grant execute on function public.get_gym_feed() to authenticated;
