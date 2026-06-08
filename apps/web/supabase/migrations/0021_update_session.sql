-- 0021_update_session.sql — 세션 수정 RPC (PRD F3 편집, 2026-06-08)
-- log_session(0013, insert)의 update 대응: 세션 본체 UPDATE + 자식(종목/기술/태그/미디어) 재동기화.
-- 자식은 delete-all 후 재insert(diff보다 단순·원자적, 단일 트랜잭션). is_favorite/created_at 은
-- 건드리지 않는다 — 즐겨찾기는 별표 토글이 따로 관리(편집 폼에 없음), 생성시각은 불변.
-- ⚠ 배포 순서: 세션 편집 클라 코드(updateSession 액션) 배포 **전에** db:push — 적용 전이면 RPC 부재로 실패.
create or replace function public.update_session(
  p_user uuid,
  p_session_id uuid,
  p_trained_on date,
  p_gym text default null,
  p_class_type class_type default null,
  p_duration_min int default null,
  p_intensity int default null,
  p_rounds int default null,
  p_partners text default null,
  p_memo_md text default null,
  p_rating int default null,
  p_disciplines jsonb default '[]'::jsonb,
  p_techniques jsonb default '[]'::jsonb,
  p_tag_ids jsonb default '[]'::jsonb,
  p_media jsonb default '[]'::jsonb
)
returns uuid                              -- sessions.id (변경된 세션)
language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare
  v_disc text;
  v_tech jsonb;
  v_tag uuid;
  v_media jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user then
    raise exception 'unauthorized: auth.uid() mismatch';
  end if;
  if jsonb_array_length(p_disciplines) = 0 then
    raise exception 'discipline_required';  -- PRD F3/AC1: 종목 1개 이상 필수
  end if;

  -- 본체 UPDATE (소유 행만 — RLS + user_id 조건 이중). is_favorite/created_at 은 불변.
  update sessions set
    trained_on   = p_trained_on,
    gym          = p_gym,
    class_type   = p_class_type,
    duration_min = p_duration_min,
    intensity    = p_intensity,
    rounds       = p_rounds,
    partners     = p_partners,
    memo_md      = p_memo_md,
    rating       = p_rating
  where id = p_session_id and user_id = p_user;
  if not found then
    raise exception 'session_not_found';  -- 없거나 타인 소유 → 거부
  end if;

  -- 자식 재동기화: 기존 연결 전부 제거 후 입력으로 재생성(원자적, 트랜잭션 내).
  -- (media_links/taggables 삭제는 연결만 끊고 media_assets/tags 자원은 보존 — log_session과 동일 정책.)
  delete from session_disciplines where session_id = p_session_id;
  for v_disc in select jsonb_array_elements_text(p_disciplines) loop
    insert into session_disciplines (session_id, discipline)
    values (p_session_id, v_disc::discipline) on conflict do nothing;
  end loop;

  delete from session_techniques where session_id = p_session_id;
  for v_tech in select * from jsonb_array_elements(p_techniques) loop
    insert into session_techniques (session_id, technique_id, day_memo_md)
    values (p_session_id, (v_tech->>'technique_id')::uuid, v_tech->>'day_memo_md')
    on conflict (session_id, technique_id) do update set day_memo_md = excluded.day_memo_md;
  end loop;

  delete from taggables where session_id = p_session_id;
  for v_tag in select (jsonb_array_elements_text(p_tag_ids))::uuid loop
    insert into taggables (tag_id, session_id)
    values (v_tag, p_session_id) on conflict do nothing;
  end loop;

  delete from media_links where session_id = p_session_id;
  for v_media in select * from jsonb_array_elements(p_media) loop
    insert into media_links (media_id, session_id)
    values ((v_media->>'media_id')::uuid, p_session_id) on conflict do nothing;
  end loop;

  return p_session_id;
end;
$$;

grant execute on function public.update_session(uuid, uuid, date, text, class_type, int, int, int, text, text, int, jsonb, jsonb, jsonb, jsonb)
  to authenticated;
