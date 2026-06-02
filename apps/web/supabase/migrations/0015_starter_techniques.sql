-- 0015_starter_techniques.sql — 프리셋 기술 시드 (사용자 결정: 프리셋 시드)
-- 전역 공유 테이블 대신 "신규 가입자의 본인 소유 복사본"으로 삽입 →
-- techniques는 순수 user-owned 유지(RLS 단순·자유 편집/삭제).
create or replace function public.seed_starter_techniques(p_user uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if exists (select 1 from techniques where user_id = p_user) then
    return;                                  -- 이미 보유 시 skip (재호출 안전)
  end if;
  insert into techniques (user_id, name, discipline, category, position, belt, striking_style, description_md, details_md)
  values
    (p_user, '마운트 이스케이프 (엘보-니)',  'bjj_gi',    'escape',      'mount',        'white', null,        '', ''),
    (p_user, '트라이앵글 초크',              'bjj_nogi',  'submission',  'closed_guard', 'blue',  null,        '', ''),
    (p_user, '더블 레그 테이크다운',         'wrestling', 'takedown',    'standing',     null,    null,        '', ''),
    (p_user, '잽-크로스-로우킥',            'striking',  'combination', 'standing',     null,    'muay_thai', '', '')
    -- TODO(T13): 종목별 8~12개(흰/파랑 위주) 프리셋 콘텐츠 확정
  ;
end;
$$;

-- handle_new_user 재정의(0003 함수 대체): 가입 시 프로필 + 프리셋 시드
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  insert into public.profiles (user_id, display_name, timezone)
  values (new.id, '', 'Asia/Seoul') on conflict (user_id) do nothing;
  perform public.seed_starter_techniques(new.id);
  return new;
end;
$$;
