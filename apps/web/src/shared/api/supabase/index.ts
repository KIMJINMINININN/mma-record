/**
 * Supabase 접근 레이어 공개 API (export 4종 — Develop §6.5).
 *
 * 주의: `createSupabaseServerClient` / `createSupabaseAdminClient`는 `server-only`다.
 * 클라이언트 컴포넌트에서는 이 배럴 대신 `./client`(또는
 * `@/shared/api/supabase/client`)에서 `createSupabaseBrowserClient`를 직접 import 할 것.
 */
export { createSupabaseServerClient } from './server';
export { createSupabaseBrowserClient } from './client';
export { createSupabaseAdminClient } from './admin';
export type { Database, Json } from './types';
