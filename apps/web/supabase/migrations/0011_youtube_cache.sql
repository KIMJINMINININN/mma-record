-- 0011_youtube_cache.sql — YouTube Data API 검색 결과 캐시 (/api/youtube/search)
-- 동일 검색어 반복 호출 시 쿼터 절약. 만료는 앱에서 fetched_at 기준 판단(예: 24h).
create table youtube_cache (
  query text primary key,                 -- 정규화된 검색어(소문자/trim)
  results jsonb not null,                 -- YouTube search items 원본/정제 결과
  fetched_at timestamptz not null default now()
);

alter table youtube_cache enable row level security;
-- 검색 결과는 공개성 → 인증 사용자 읽기 허용. 쓰기는 service_role(admin client)만(별도 정책 없음 → RLS bypass).
create policy "youtube_cache_read_auth" on youtube_cache
  for select to authenticated using (true);
