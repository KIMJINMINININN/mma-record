-- 0010_views.sql — 캘린더 월간 그리드용 하루 요약 (PRD F2/R2)
-- security_invoker=true 필수: 미지정 시 뷰는 '소유자 권한'으로 실행되어 RLS를 우회한다.
create view calendar_day_summary with (security_invoker = true) as
  select
    s.user_id,
    s.trained_on,
    count(distinct s.id)                                   as session_count,
    array_agg(distinct sd.discipline)
      filter (where sd.discipline is not null)             as disciplines,
    bool_or(exists (
      select 1 from media_links ml
      where ml.session_id = s.id
    ))                                                     as has_media
  from sessions s
  left join session_disciplines sd on sd.session_id = s.id
  group by s.user_id, s.trained_on;
-- security_invoker=true 로 인해 기반 테이블 RLS가 호출자(auth user) 기준 적용 → 본인 데이터만.
