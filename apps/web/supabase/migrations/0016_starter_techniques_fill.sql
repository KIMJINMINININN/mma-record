-- 0016_starter_techniques_fill.sql — 프리셋 기술 전체 목록 채움 (T13 확정)
-- 0015의 seed_starter_techniques()를 종목별 7~9개(흰/파랑·기초 위주)로 교체.
-- techniques는 순수 user-owned → 신규 가입자가 본인 소유 복사본으로 받고 자유롭게 편집/삭제/추가한다.
-- handle_new_user()는 0015 정의 그대로(이 함수를 이름으로 호출) → 재정의 불필요.
-- 분류/포지션/벨트/타격스타일은 enums(0002)에 매핑된 유효값. 설명/주의점은 빈 문자열(사용자가 채움).
create or replace function public.seed_starter_techniques(p_user uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if exists (select 1 from techniques where user_id = p_user) then
    return;                                  -- 이미 보유 시 skip (재호출 안전)
  end if;
  insert into techniques (user_id, name, discipline, category, position, belt, striking_style, description_md, details_md)
  values
    -- 주짓수 기 (bjj_gi)
    (p_user, '마운트 이스케이프 (엘보-니)', 'bjj_gi',   'escape',      'mount',        'white', null,        '', ''),
    (p_user, '시저 스윕',                   'bjj_gi',   'sweep',       'closed_guard', 'white', null,        '', ''),
    (p_user, '크로스 칼라 초크',            'bjj_gi',   'submission',  'mount',        'blue',  null,        '', ''),
    (p_user, '클로즈드가드 암바',           'bjj_gi',   'submission',  'closed_guard', 'blue',  null,        '', ''),
    (p_user, '토레안도 패스',               'bjj_gi',   'pass',        'open_guard',   'blue',  null,        '', ''),
    (p_user, '니 슬라이스 패스',            'bjj_gi',   'pass',        'half_guard',   'blue',  null,        '', ''),
    (p_user, '사이드컨트롤 유지',           'bjj_gi',   'control',     'side_control', 'white', null,        '', ''),
    (p_user, '마운트→백테이크',             'bjj_gi',   'transition',  'mount',        'blue',  null,        '', ''),
    (p_user, '라쏘 훅 스윕',                'bjj_gi',   'sweep',       'open_guard',   'blue',  null,        '', ''),
    -- 주짓수 노기 (bjj_nogi)
    (p_user, '트라이앵글 초크',             'bjj_nogi', 'submission',  'closed_guard', 'blue',  null,        '', ''),
    (p_user, '길로틴 초크',                 'bjj_nogi', 'submission',  'standing',     'white', null,        '', ''),
    (p_user, '기무라',                      'bjj_nogi', 'submission',  'half_guard',   'blue',  null,        '', ''),
    (p_user, '리어 네이키드 초크 (RNC)',    'bjj_nogi', 'submission',  'back_control', 'white', null,        '', ''),
    (p_user, '시팅가드 스윕',               'bjj_nogi', 'sweep',       'open_guard',   'white', null,        '', ''),
    (p_user, '가드 리텐션 (프레임)',        'bjj_nogi', 'defense',     'open_guard',   'white', null,        '', ''),
    (p_user, '더블언더 패스',               'bjj_nogi', 'pass',        'open_guard',   'blue',  null,        '', ''),
    (p_user, '다스 초크',                   'bjj_nogi', 'submission',  'turtle',       'blue',  null,        '', ''),
    (p_user, '싱글레그→백테이크',           'bjj_nogi', 'transition',  'standing',     'blue',  null,        '', ''),
    -- 레슬링 (wrestling) — 벨트/타격스타일 없음
    (p_user, '더블 레그 테이크다운',        'wrestling', 'takedown',   'standing',     null,    null,        '', ''),
    (p_user, '싱글 레그 테이크다운',        'wrestling', 'takedown',   'standing',     null,    null,        '', ''),
    (p_user, '하이 크로치',                 'wrestling', 'takedown',   'standing',     null,    null,        '', ''),
    (p_user, '스프롤 (방어)',               'wrestling', 'defense',    'standing',     null,    null,        '', ''),
    (p_user, '덕 언더',                     'wrestling', 'transition', 'clinch',       null,    null,        '', ''),
    (p_user, '보디락 (클린치)',             'wrestling', 'control',    'clinch',       null,    null,        '', ''),
    (p_user, '라이드 (탑 컨트롤)',          'wrestling', 'control',    'turtle',       null,    null,        '', ''),
    -- 타격 (striking) — 타격 스타일 포함
    (p_user, '잽-크로스 (1-2)',             'striking', 'combination', 'standing',     null,    'boxing',    '', ''),
    (p_user, '로우킥',                      'striking', 'kick',        'standing',     null,    'muay_thai', '', ''),
    (p_user, '미들킥 (바디)',               'striking', 'kick',        'standing',     null,    'muay_thai', '', ''),
    (p_user, '텝 (티프)',                   'striking', 'kick',        'standing',     null,    'muay_thai', '', ''),
    (p_user, '잽-크로스-로우킥',            'striking', 'combination', 'standing',     null,    'muay_thai', '', ''),
    (p_user, '레그 체크 (방어)',            'striking', 'defense',     'standing',     null,    'muay_thai', '', ''),
    (p_user, '클린치 니',                   'striking', 'knee',        'clinch',       null,    'muay_thai', '', ''),
    (p_user, '호리젠탈 엘보',               'striking', 'elbow',       'clinch',       null,    'muay_thai', '', ''),
    (p_user, '슬립→카운터 크로스',          'striking', 'combination', 'standing',     null,    'boxing',    '', ''),
    -- MMA (mma)
    (p_user, '더블레그 (케이지)',           'mma',      'takedown',         'standing',   null,  null,        '', ''),
    (p_user, '케이지 클린치 컨트롤',        'mma',      'cage_work',        'clinch',     null,  null,        '', ''),
    (p_user, '그라운드앤파운드 (하프탑)',   'mma',      'ground_and_pound', 'half_guard', null,  null,        '', ''),
    (p_user, '스프롤→니',                   'mma',      'defense',          'standing',   null,  null,        '', ''),
    (p_user, '백컨트롤→RNC',                'mma',      'submission',       'back_control', null, null,       '', ''),
    (p_user, '레벨체인지 셋업',             'mma',      'entry',            'standing',   null,  null,        '', ''),
    (p_user, '테크니컬 스탠드업',           'mma',      'escape',           'open_guard', null,  null,        '', '')
  ;
end;
$$;
