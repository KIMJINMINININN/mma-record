-- 0020_starter_techniques_level.sql — 프리셋 비주짓수 기술 level 기본값 (F4 후속, 2026-06-08)
-- 0016 seed_starter_techniques() 는 level 컬럼 도입(0017) 전이라 비주짓수 프리셋(레슬링·타격·MMA,
-- belt=null)이 level=null 로 들어갔다 → 레벨 칩/필터/통계 포지션 분포에서 빠짐.
-- 입문(beginner) 기본값을 부여한다(프리셋은 흰/파랑·기초 위주). 사용자는 개별 편집으로 조정.
-- 주짓수 18종은 belt 트랙이라 level=null 유지 — belt↔level 상호배타(0017).
--
-- 배포: db:push 만으로 충분(코드 영향 없음 — UI/쿼리는 level 을 이미 읽음, 컬럼은 0017 에 존재).
-- 두 부분: (1) seed 함수 재정의(신규 가입자) (2) 기존 프리셋 백필(이미 가입한 계정 — 사장님 포함).

-- (1) 신규 가입자: seed 를 level 포함해 재정의(0016 + level). handle_new_user()는 이 함수를 이름으로 호출 → 재정의 불필요.
create or replace function public.seed_starter_techniques(p_user uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if exists (select 1 from techniques where user_id = p_user) then
    return;                                  -- 이미 보유 시 skip (재호출 안전)
  end if;
  insert into techniques (user_id, name, discipline, category, position, belt, striking_style, level, description_md, details_md)
  values
    -- 주짓수 기 (bjj_gi) — belt 트랙, level null
    (p_user, '마운트 이스케이프 (엘보-니)', 'bjj_gi',   'escape',      'mount',        'white', null,        null,       '', ''),
    (p_user, '시저 스윕',                   'bjj_gi',   'sweep',       'closed_guard', 'white', null,        null,       '', ''),
    (p_user, '크로스 칼라 초크',            'bjj_gi',   'submission',  'mount',        'blue',  null,        null,       '', ''),
    (p_user, '클로즈드가드 암바',           'bjj_gi',   'submission',  'closed_guard', 'blue',  null,        null,       '', ''),
    (p_user, '토레안도 패스',               'bjj_gi',   'pass',        'open_guard',   'blue',  null,        null,       '', ''),
    (p_user, '니 슬라이스 패스',            'bjj_gi',   'pass',        'half_guard',   'blue',  null,        null,       '', ''),
    (p_user, '사이드컨트롤 유지',           'bjj_gi',   'control',     'side_control', 'white', null,        null,       '', ''),
    (p_user, '마운트→백테이크',             'bjj_gi',   'transition',  'mount',        'blue',  null,        null,       '', ''),
    (p_user, '라쏘 훅 스윕',                'bjj_gi',   'sweep',       'open_guard',   'blue',  null,        null,       '', ''),
    -- 주짓수 노기 (bjj_nogi) — belt 트랙, level null
    (p_user, '트라이앵글 초크',             'bjj_nogi', 'submission',  'closed_guard', 'blue',  null,        null,       '', ''),
    (p_user, '길로틴 초크',                 'bjj_nogi', 'submission',  'standing',     'white', null,        null,       '', ''),
    (p_user, '기무라',                      'bjj_nogi', 'submission',  'half_guard',   'blue',  null,        null,       '', ''),
    (p_user, '리어 네이키드 초크 (RNC)',    'bjj_nogi', 'submission',  'back_control', 'white', null,        null,       '', ''),
    (p_user, '시팅가드 스윕',               'bjj_nogi', 'sweep',       'open_guard',   'white', null,        null,       '', ''),
    (p_user, '가드 리텐션 (프레임)',        'bjj_nogi', 'defense',     'open_guard',   'white', null,        null,       '', ''),
    (p_user, '더블언더 패스',               'bjj_nogi', 'pass',        'open_guard',   'blue',  null,        null,       '', ''),
    (p_user, '다스 초크',                   'bjj_nogi', 'submission',  'turtle',       'blue',  null,        null,       '', ''),
    (p_user, '싱글레그→백테이크',           'bjj_nogi', 'transition',  'standing',     'blue',  null,        null,       '', ''),
    -- 레슬링 (wrestling) — belt 없음, level=beginner
    (p_user, '더블 레그 테이크다운',        'wrestling', 'takedown',   'standing',     null,    null,        'beginner', '', ''),
    (p_user, '싱글 레그 테이크다운',        'wrestling', 'takedown',   'standing',     null,    null,        'beginner', '', ''),
    (p_user, '하이 크로치',                 'wrestling', 'takedown',   'standing',     null,    null,        'beginner', '', ''),
    (p_user, '스프롤 (방어)',               'wrestling', 'defense',    'standing',     null,    null,        'beginner', '', ''),
    (p_user, '덕 언더',                     'wrestling', 'transition', 'clinch',       null,    null,        'beginner', '', ''),
    (p_user, '보디락 (클린치)',             'wrestling', 'control',    'clinch',       null,    null,        'beginner', '', ''),
    (p_user, '라이드 (탑 컨트롤)',          'wrestling', 'control',    'turtle',       null,    null,        'beginner', '', ''),
    -- 타격 (striking) — 타격 스타일 포함, level=beginner
    (p_user, '잽-크로스 (1-2)',             'striking', 'combination', 'standing',     null,    'boxing',    'beginner', '', ''),
    (p_user, '로우킥',                      'striking', 'kick',        'standing',     null,    'muay_thai', 'beginner', '', ''),
    (p_user, '미들킥 (바디)',               'striking', 'kick',        'standing',     null,    'muay_thai', 'beginner', '', ''),
    (p_user, '텝 (티프)',                   'striking', 'kick',        'standing',     null,    'muay_thai', 'beginner', '', ''),
    (p_user, '잽-크로스-로우킥',            'striking', 'combination', 'standing',     null,    'muay_thai', 'beginner', '', ''),
    (p_user, '레그 체크 (방어)',            'striking', 'defense',     'standing',     null,    'muay_thai', 'beginner', '', ''),
    (p_user, '클린치 니',                   'striking', 'knee',        'clinch',       null,    'muay_thai', 'beginner', '', ''),
    (p_user, '호리젠탈 엘보',               'striking', 'elbow',       'clinch',       null,    'muay_thai', 'beginner', '', ''),
    (p_user, '슬립→카운터 크로스',          'striking', 'combination', 'standing',     null,    'boxing',    'beginner', '', ''),
    -- MMA (mma) — belt 없음, level=beginner
    (p_user, '더블레그 (케이지)',           'mma',      'takedown',         'standing',     null,  null,    'beginner', '', ''),
    (p_user, '케이지 클린치 컨트롤',        'mma',      'cage_work',        'clinch',       null,  null,    'beginner', '', ''),
    (p_user, '그라운드앤파운드 (하프탑)',   'mma',      'ground_and_pound', 'half_guard',   null,  null,    'beginner', '', ''),
    (p_user, '스프롤→니',                   'mma',      'defense',          'standing',     null,  null,    'beginner', '', ''),
    (p_user, '백컨트롤→RNC',                'mma',      'submission',       'back_control', null,  null,    'beginner', '', ''),
    (p_user, '레벨체인지 셋업',             'mma',      'entry',            'standing',     null,  null,    'beginner', '', ''),
    (p_user, '테크니컬 스탠드업',           'mma',      'escape',           'open_guard',   null,  null,    'beginner', '', '')
  ;
end;
$$;

-- (2) 기존 가입자 백필: 프리셋 비주짓수 기술 중 level 미설정 → beginner.
--     이름+종목 매칭(사용자가 편집/직접 생성한 기술은 제외). belt is null 이중 안전.
--     UNIQUE(user_id, name) 가정 아님 → 동명 다건이어도 조건 동일 적용(의도된 기본값).
update techniques set level = 'beginner'
where level is null
  and belt is null
  and discipline in ('wrestling', 'striking', 'mma')
  and name in (
    '더블 레그 테이크다운', '싱글 레그 테이크다운', '하이 크로치', '스프롤 (방어)', '덕 언더', '보디락 (클린치)', '라이드 (탑 컨트롤)',
    '잽-크로스 (1-2)', '로우킥', '미들킥 (바디)', '텝 (티프)', '잽-크로스-로우킥', '레그 체크 (방어)', '클린치 니', '호리젠탈 엘보', '슬립→카운터 크로스',
    '더블레그 (케이지)', '케이지 클린치 컨트롤', '그라운드앤파운드 (하프탑)', '스프롤→니', '백컨트롤→RNC', '레벨체인지 셋업', '테크니컬 스탠드업'
  );
