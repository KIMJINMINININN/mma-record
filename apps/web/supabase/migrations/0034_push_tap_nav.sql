-- 0034_push_tap_nav.sql — 푸시 탭 → 해당 화면 이동 (2026-06-11)
-- 0026(공유 코멘트)/0033(체육관 코멘트) 푸시 페이로드에 data.url(웹 내부 경로)을 추가한다.
-- 네이티브 앱이 알림 탭 시 이 경로로 WebView를 이동시킨다(use-webview의 response 리스너).
--   · 공유 코멘트  → '/share/<token>'      (코멘트가 달린 공유 페이지 — 토큰 필요라 shares를 다시 읽음)
--   · 체육관 코멘트 → '/gym/feed/<id>'      (체육관 공유 상세 — gym_share_id 그대로)
-- 함수 본문만 교체(create or replace) — 트리거 바인딩 불변. 구 APK는 data.url을 몰라서 무시(양방향 안전,
-- 기존 shareId/gymShareId 필드도 유지). 배포 순서 제약 없음(서버 먼저 적용해도 OK).

-- 0026 notify_share_owner_on_comment — data에 url 추가(공유 token을 함께 조회).
create or replace function notify_share_owner_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_owner uuid;
  v_token text;
  v_rec record;
begin
  select owner_id, token into v_owner, v_token from shares where id = NEW.share_id;
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
        'data', jsonb_build_object(
          'shareId', NEW.share_id,
          'url', '/share/' || v_token
        )
      )
    );
  end loop;
  return NEW;
end;
$$;

-- 0033 notify_gym_share_member_on_comment — data에 url 추가(gym_share_id 그대로 경로화).
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
        'data', jsonb_build_object(
          'gymShareId', NEW.gym_share_id,
          'url', '/gym/feed/' || NEW.gym_share_id::text
        )
      )
    );
  end loop;
  return NEW;
end;
$$;
