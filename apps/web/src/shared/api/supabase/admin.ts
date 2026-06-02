import 'server-only';

import { createClient } from '@supabase/supabase-js';

import type { Database } from './types';

/**
 * 관리자(서비스) Supabase 클라이언트 — secret 키로 RLS를 우회한다.
 *
 * 서명 업로드 URL 발급(`/api/media/sign-upload`), `youtube_cache` write 등
 * 서버 전용 작업에만 사용한다.
 *
 * ⚠️ secret 키는 절대 브라우저로 노출 금지. Route Handler / Server Action에서만 호출.
 *
 * SSoT: docs/mma/Develop.md §3.3 / §5 / §7
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
