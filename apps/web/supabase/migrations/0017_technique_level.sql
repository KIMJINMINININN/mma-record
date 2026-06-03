-- 0017_technique_level.sql — 비벨트 종목 기술 레벨 적합도 (PRD §3 / F4 P1).
-- ⚠ 배포 순서: F4 클라 코드 배포 **전에** 적용할 것 — insert/update 가 `level` 컬럼을 보내므로
--    적용 전이면 기술 생성/편집이 PGRST204 로 실패한다(읽기는 select(*)+cast 라 안전).
-- 레슬링·타격·MMA 는 벨트가 없어, belt 적합도 대신 입문/중급/고급 level 적합도를 쓴다.
-- 값은 belt/discipline 관례대로 ascii 키 — UI(LEVEL_META)가 한글 라벨(입문/중급/고급)로 매핑.
-- (사용자 개인 랭크 user_ranks.level[text] 와는 별개 축 — 여긴 "기술의 난이도/적합도".)
create type skill_level as enum ('beginner', 'intermediate', 'advanced');

-- belt/striking_style 와 동일하게 nullable — 해당 안 되는 기술(주짓수 등)은 null.
alter table techniques add column level skill_level;
