-- 0013_log_session.sql — 세션 원자 삽입 RPC (PRD F3)
-- 세션 1 + 종목 N + 기술링크 N(그날메모) + 태그 N + 미디어링크 N을 단일 트랜잭션으로.
-- security invoker + 본문 auth.uid() 검증. 실패 시 rollback(서버 액션에서 한국어 변환).
--   p_disciplines: ["bjj_nogi","mma"]
--   p_techniques:  [{ "technique_id": "<uuid>", "day_memo_md": "<text|null>" }]
--   p_tag_ids:     ["<uuid>", ...]            (이미 존재하는 태그 id)
--   p_media:       [{ "media_id": "<uuid>" }]  (이미 생성된 media_assets 연결)
create or replace function public.log_session(
  p_user uuid,
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
returns uuid                              -- sessions.id
language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare
  v_session_id uuid;
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

  insert into sessions (user_id, trained_on, gym, class_type, duration_min,
                        intensity, rounds, partners, memo_md, rating)
  values (p_user, p_trained_on, p_gym, p_class_type, p_duration_min,
          p_intensity, p_rounds, p_partners, p_memo_md, p_rating)
  returning id into v_session_id;

  for v_disc in select jsonb_array_elements_text(p_disciplines) loop
    insert into session_disciplines (session_id, discipline)
    values (v_session_id, v_disc::discipline) on conflict do nothing;
  end loop;

  for v_tech in select * from jsonb_array_elements(p_techniques) loop
    insert into session_techniques (session_id, technique_id, day_memo_md)
    values (v_session_id, (v_tech->>'technique_id')::uuid, v_tech->>'day_memo_md')
    on conflict (session_id, technique_id) do update set day_memo_md = excluded.day_memo_md;
  end loop;

  for v_tag in select (jsonb_array_elements_text(p_tag_ids))::uuid loop
    insert into taggables (tag_id, session_id)
    values (v_tag, v_session_id) on conflict do nothing;
  end loop;

  for v_media in select * from jsonb_array_elements(p_media) loop
    insert into media_links (media_id, session_id)
    values ((v_media->>'media_id')::uuid, v_session_id) on conflict do nothing;
  end loop;

  return v_session_id;
end;
$$;

grant execute on function public.log_session(uuid, date, text, class_type, int, int, int, text, text, int, jsonb, jsonb, jsonb, jsonb)
  to authenticated;
