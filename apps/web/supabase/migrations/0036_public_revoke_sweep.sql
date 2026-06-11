-- 0036_public_revoke_sweep.sql — 이전 마이그레이션 PUBLIC revoke 스윕 (보안 하드닝, 2026-06-11)
-- 0028 보안리뷰 H1 후속: Postgres는 함수 생성 시 PUBLIC에 EXECUTE를 기본 부여한다.
-- 0028(gym) 이전 마이그레이션의 RPC 노출 definer 함수들은 명시 grant만 추가하고 PUBLIC 기본을
-- 안 걷어서, 의도한 대상(anon/authenticated 명시분)과 무관하게 모든 롤에 EXECUTE가 남아 있었다.
-- 실해는 내부 auth.uid() 가드들이 막고 있었지만(add_shared_comment 등), 표면을 닫는다.
--
-- 스윕 기준: PostgREST로 호출 가능한(security definer + RPC 노출) 함수만.
--   · 트리거 함수(returns trigger — handle_new_user/set_updated_at/notify_*)는 RPC 호출 자체가
--     불가하므로 제외(노이즈 방지).
--   · 0027 계열은 0028에서, 0029~0035는 생성 시점에 이미 revoke 완료(create or replace는 기존
--     ACL을 보존하므로 0031/0032의 재정의도 영향 없음).
-- revoke 후 의도 대상 grant를 같은 파일에서 재명시한다(자가 문서화·멱등 — 기존 grant와 중복 무해).

-- 0015 seed_starter_techniques — handle_new_user 트리거 내부 호출 전용(웹 직접 호출 0건 확인).
-- definer 트리거가 부르는 경로는 소유자 권한으로 EXECUTE가 평가되므로 별도 grant 불필요.
revoke execute on function public.seed_starter_techniques(uuid) from public;

-- 0022 세션 공유 조회 — 익명 공유 페이지가 쓰므로 anon 유지.
revoke execute on function public.get_shared_session(text) from public;
grant execute on function public.get_shared_session(text) to anon, authenticated;

-- 0024 기술 공유 + 봉투 조회 — 동일하게 anon 유지.
revoke execute on function public.get_shared_technique(text) from public;
revoke execute on function public.get_shared_resource(text) from public;
grant execute on function public.get_shared_technique(text) to anon, authenticated;
grant execute on function public.get_shared_resource(text) to anon, authenticated;

-- 0025 공유 코멘트 — 읽기는 anon, 쓰기/삭제는 로그인만(함수 내부 auth.uid() 가드와 일치).
revoke execute on function public.get_shared_comments(text) from public;
revoke execute on function public.add_shared_comment(text, text) from public;
revoke execute on function public.delete_shared_comment(uuid) from public;
grant execute on function public.get_shared_comments(text) to anon, authenticated;
grant execute on function public.add_shared_comment(text, text) to authenticated;
grant execute on function public.delete_shared_comment(uuid) to authenticated;

-- 0026 푸시 토큰 등록 — 로그인만(0035 unregister와 대칭).
revoke execute on function public.register_push_token(text, text) from public;
grant execute on function public.register_push_token(text, text) to authenticated;
