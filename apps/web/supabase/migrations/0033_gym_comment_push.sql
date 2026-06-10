-- 0033_gym_comment_push.sql — 체육관 Phase ③: 코치 피드백 → 관원 푸시 (2026-06-10)
-- 0030 gym_comments 에 코멘트가 달리면 공유한 **관원**에게 푸시(본인 코멘트는 스킵 — 코치/관장 피드백만 알림).
-- 0026 파이프라인 재사용: push_tokens · pg_net · Expo Push API. 토큰 등록(register_push_token)·WebView 브릿지는
-- 이미 0026에 있으므로 트리거만 추가한다. 휴면: push_tokens 비면 루프 0회 = no-op(EAS 빌드+자격+토큰 전까지).
-- SSoT: docs/issue/20260610/gym-phase2-plan.md

-- 코멘트 insert → 공유 관원에게 푸시. 관원의 push_tokens를 읽어야 하므로(작성자≠관원) security definer(RLS 우회).
create or replace function notify_gym_share_member_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_member uuid;
  v_author text;
  v_rec record;
begin
  select gs.member_id into v_member from gym_shares gs where gs.id = NEW.gym_share_id;
  if v_member is null or v_member = NEW.author_id then
    return NEW;  -- 공유 없음 or 본인 코멘트 → 알림 스킵
  end if;
  select coalesce(nullif(btrim(display_name), ''), '코치') into v_author
    from profiles where user_id = NEW.author_id;
  for v_rec in select token from push_tokens where user_id = v_member loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'to', v_rec.token,
        'title', '체육관 피드백',
        'body', coalesce(v_author, '코치') || ': ' || left(NEW.body, 80),
        'data', jsonb_build_object('gymShareId', NEW.gym_share_id)
      )
    );
  end loop;
  return NEW;
end;
$$;

create trigger gym_comments_notify_member
  after insert on gym_comments
  for each row execute function notify_gym_share_member_on_comment();
