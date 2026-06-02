-- 0001_init.sql — 확장
-- 한글 부분일치/유사도 검색(기술명·세션 메모·태그명)에 사용. PRD F8.
create extension if not exists pg_trgm;
