-- 0023_reminder.sql — 훈련 리마인더 설정 (푸시 MVP, 2026-06-08)
-- 로컬 알림(디바이스 스케줄)용 설정을 profiles에 저장 → 모바일 앱이 WebView 브릿지로 받아
-- expo-notifications로 요일/시간 반복 알림을 건다(서버 푸시 아님 — 토큰/발송 인프라 불필요).
-- 웹에서 설정·저장하고, 앱이 그 값을 읽어 네이티브 스케줄을 동기화한다.
alter table profiles
  add column reminder_enabled boolean not null default false,
  -- 알림 요일: 0=일 ~ 6=토 (비면 알림 없음). dayjs day()/JS getDay()와 동일 컨벤션.
  add column reminder_days smallint[] not null default '{}',
  -- 알림 시각 'HH:MM' (24h, 디바이스 로컬 시간 기준). 기본 저녁 7시.
  add column reminder_time text not null default '19:00';
