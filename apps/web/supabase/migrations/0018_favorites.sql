-- 0018_favorites.sql — 즐겨찾기 (PRD §9 P1 "정렬/즐겨찾기"). 기술 + 세션 모두.
-- ⚠ 배포 순서: 즐겨찾기 토글 코드 배포 **전에** 적용 — 토글 update 가 is_favorite 를 보내므로
--    적용 전이면 토글이 PGRST204 로 실패한다. (기존 기술 생성/편집·세션 기록은 is_favorite 를
--    보내지 않으므로 영향 없음 — insert 스키마/RPC 가 컬럼을 생략 → DB default false.)
-- 단일 boolean 토글이라 별도 favorites 테이블 불필요 — RLS(auth.uid()=user_id)로 본인 행만.
alter table techniques add column is_favorite boolean not null default false;
alter table sessions   add column is_favorite boolean not null default false;

-- "즐겨찾기만" 필터 / "즐겨찾기순" 정렬 가속 — 부분 인덱스(true 행만).
create index techniques_user_favorite_idx on techniques(user_id) where is_favorite;
create index sessions_user_favorite_idx   on sessions(user_id)   where is_favorite;
