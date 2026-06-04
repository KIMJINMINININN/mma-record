-- 0019_search_all_belt.sql — search_all RPC 에 belt 투영 (F8 벨트 패싯, PRD §F8-AC4)
--
-- 0012 의 search_all 에 belt 컬럼을 추가한다. RETURNS TABLE 컬럼 추가는 CREATE OR REPLACE 로는
-- 불가(반환 타입 변경) → DROP + CREATE. belt 는 technique 행만 채운다(t.belt::text);
-- session/tag 는 null. 클라 패싯(applyFacets)이 discipline/period 와 동일한 대칭 규칙으로
-- technique 행만 belt 로 거른다 — 서버 p_belt 파라미터는 두지 않는다(클라 필터 일관, p_limit 한계 동일).
-- 시그니처(text, int)는 그대로라 search-all.ts 호출부는 무변경.
drop function if exists public.search_all(text, int);

create function public.search_all(
  p_query text,
  p_limit int default 30
)
returns table (
  result_type text,        -- 'technique' | 'session' | 'tag'
  result_id uuid,
  title text,
  subtitle text,           -- 종목/날짜 등 부가표시
  belt text,               -- technique 행만(t.belt); session/tag 는 null. 벨트 패싯용(F8-AC4).
  rank real
)
language sql stable security invoker
set search_path = public, pg_temp
as $$
  with q as (select trim(p_query) as q)
  -- 기술
  select 'technique'::text, t.id, t.name,
         t.discipline::text as subtitle,
         t.belt::text as belt,
         case
           when t.name ilike (select qq.q || '%' from q qq) then 1.0::real
           when t.name ilike (select '%' || qq.q || '%' from q qq) then 0.7::real
           else greatest(similarity(t.name, (select qq.q from q qq)),
                         similarity(coalesce(t.description_md,''), (select qq.q from q qq)))
         end as rank
  from techniques t
  where t.user_id = auth.uid()
    and ( t.name ilike (select '%' || qq.q || '%' from q qq)
       or t.description_md ilike (select '%' || qq.q || '%' from q qq)
       or similarity(t.name, (select qq.q from q qq)) > 0.2 )
  union all
  -- 세션 (메모/체육관)
  select 'session'::text, s.id,
         coalesce(nullif(s.gym,''), to_char(s.trained_on,'YYYY-MM-DD')) as title,
         to_char(s.trained_on,'YYYY-MM-DD') as subtitle,
         null::text as belt,
         case
           when s.gym ilike (select qq.q || '%' from q qq) then 0.9::real
           else greatest(similarity(coalesce(s.memo_md,''), (select qq.q from q qq)),
                         similarity(coalesce(s.gym,''),     (select qq.q from q qq)))
         end as rank
  from sessions s
  where s.user_id = auth.uid()
    and ( s.memo_md ilike (select '%' || qq.q || '%' from q qq)
       or s.gym     ilike (select '%' || qq.q || '%' from q qq) )
  union all
  -- 태그
  select 'tag'::text, tg.id, tg.name, null::text, null::text as belt,
         case when tg.name ilike (select qq.q || '%' from q qq) then 1.0::real
              else similarity(tg.name, (select qq.q from q qq)) end as rank
  from tags tg
  where tg.user_id = auth.uid()
    and ( tg.name ilike (select '%' || qq.q || '%' from q qq)
       or similarity(tg.name, (select qq.q from q qq)) > 0.2 )
  order by rank desc
  limit p_limit;
$$;

grant execute on function public.search_all(text, int) to authenticated;
