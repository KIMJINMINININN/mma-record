-- 0024_share_technique.sql — 기술 공개 링크 (F11 후속, 2026-06-08)
-- 0022_shares.sql 의 세션 공유에 이어 **기술**도 토큰 링크로 공개 읽기 공유한다.
-- shares 테이블은 이미 resource_type 에 'technique' 자리를 두었으므로 스키마 변경은 없다(테이블/RLS 그대로).
-- 추가: get_shared_technique(기술 합성 jsonb) + get_shared_resource(타입 분기 봉투) RPC.
-- 공유 뷰는 RLS(auth.uid()=user_id)를 우회해야 익명이 보므로 security definer RPC로 한정 노출한다
-- (토큰 보유자만, 업로드 미디어는 anon 서명URL 불가 → youtube/external 만 노출).
-- 역참조 세션(이 기술을 다룬)은 소유자의 사생활이라 의도적으로 노출하지 않는다(상세 뷰와 달리 공유에선 생략).

-- 토큰으로 공유된 기술을 익명 읽기(읽기 전용 합성 jsonb). RLS 우회는 토큰 보유자 + 이 함수 범위로만 한정.
-- 업로드 미디어(storage_path)는 anon 서명URL 불가라 제외 — youtube/external 미디어만 노출.
create or replace function public.get_shared_technique(p_token text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select jsonb_build_object(
    'name', t.name,
    'discipline', t.discipline,
    'category', t.category,
    'position', t.position,
    'striking_style', t.striking_style,
    'belt', t.belt,
    'belt_stripes', t.belt_stripes,
    'level', t.level,
    'description_md', t.description_md,
    'details_md', t.details_md,
    'tags', (
      select coalesce(jsonb_agg(tg.name order by tg.name), '[]'::jsonb)
      from taggables tb join tags tg on tg.id = tb.tag_id where tb.technique_id = t.id
    ),
    'media', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'kind', ma.kind, 'youtube_video_id', ma.youtube_video_id,
        'external_url', ma.external_url, 'title', ma.title
      )) filter (where ma.kind in ('youtube', 'external')), '[]'::jsonb)
      from media_links ml join media_assets ma on ma.id = ml.media_id
      where ml.technique_id = t.id
    )
  )
  from shares sh
  join techniques t on t.id = sh.resource_id
  where sh.token = p_token and sh.resource_type = 'technique';
$$;

-- 타입 분기 봉투 — 토큰 1개로 세션/기술 어느 쪽이든 받게 한다(공유 뷰가 type 으로 분기).
-- resource_type 에 따라 get_shared_session / get_shared_technique 를 골라 {type, data} 로 감싼다.
create or replace function public.get_shared_resource(p_token text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select case sh.resource_type
    when 'session' then jsonb_build_object('type', 'session', 'data', public.get_shared_session(p_token))
    when 'technique' then jsonb_build_object('type', 'technique', 'data', public.get_shared_technique(p_token))
  end
  from shares sh
  where sh.token = p_token;
$$;

-- 익명(anon) + 로그인 둘 다 호출 가능 — 공유 링크는 로그인 없이 열린다(get_shared_session 과 동일).
grant execute on function public.get_shared_technique(text) to anon, authenticated;
grant execute on function public.get_shared_resource(text) to anon, authenticated;
