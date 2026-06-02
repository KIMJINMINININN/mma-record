-- 0012_search_all.sql — 글로벌 검색 RPC (PRD F8)
-- techniques(name/description) + sessions(memo/gym) + tags(name) 통합 fuzzy.
-- ILIKE prefix(1.0) > substring(0.7) > similarity(trigram) hybrid rank.
-- security invoker → RLS가 호출자 기준 적용. 내부에서 auth.uid() 직접 사용.
create or replace function public.search_all(
  p_query text,
  p_limit int default 30
)
returns table (
  result_type text,        -- 'technique' | 'session' | 'tag'
  result_id uuid,
  title text,
  subtitle text,           -- 종목/날짜 등 부가표시
  rank real
)
language sql stable security invoker
set search_path = public, pg_temp
as $$
  with q as (select trim(p_query) as q)
  -- 기술
  select 'technique'::text, t.id, t.name,
         t.discipline::text as subtitle,
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
  select 'tag'::text, tg.id, tg.name, null::text,
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
