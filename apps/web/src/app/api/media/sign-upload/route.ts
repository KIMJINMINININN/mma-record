import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isAuthEnabled } from '@/shared/api/supabase/env';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { createSupabaseAdminClient } from '@/shared/api/supabase/admin';

/**
 * POST /api/media/sign-upload — 서명 업로드 URL 발급 (F5 / Develop §5.3·§5.4).
 *
 * 도먼시(인프라 last): `isAuthEnabled()`가 false면 stale/부재 secret 키로 admin client를
 * 만들지 않고 친절한 503만 반환한다((auth)/actions.ts·log-session-action.ts 패턴과 동일).
 * 인프라 단계에서 플래그를 켜면 그대로 동작한다.
 *
 * 이중 방어(Develop §5.3): 바디(filename/size/mime/duration)를 Zod 검증 + 한도 재확인 →
 * 인증 확인 → user_id를 경로 첫 세그먼트로 강제(Storage RLS §5.1) → admin client로
 * createSignedUploadUrl 발급. 브라우저/네이티브는 받은 URL로 직접 PUT한다(함수 대역폭 절약).
 *
 * SSoT: docs/mma/Develop.md §5.3 / §5.4 / §5.1
 */

const bodySchema = z.object({
  // filename: 형태만 검증 — 경로에 절대 사용 안 함(경로주입 방지). 인프라 때 media_assets.title 후보.
  filename: z.string().min(1).max(255),
  size: z.number().int().positive(),
  mime: z.enum(['video/mp4', 'video/quicktime']),
  duration: z.number().int().positive().nullable().optional(),
});

const MAX_BYTES = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_BYTES ?? 104857600);
const MAX_DURATION = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_DURATION_SEC ?? 60);
const BUCKET = process.env.NEXT_PUBLIC_MEDIA_BUCKET ?? 'training-media';

export async function POST(req: Request) {
  // 도먼시: 인프라 전(플래그 OFF)엔 stale/부재 secret 키로 admin client를 만들지 않고 안내만.
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: '미디어 업로드는 인프라 연결 후 활성화됩니다.' }, { status: 503 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: '잘못된 업로드 요청입니다.' }, { status: 400 });
  }
  const { size, mime, duration } = parsed.data;

  // 서버측 한도 재확인(클라이언트 검증 우회 방지).
  if (size > MAX_BYTES || (duration != null && duration > MAX_DURATION)) {
    return NextResponse.json(
      { error: `한도 초과(≤${MAX_DURATION}초/≤${Math.round(MAX_BYTES / 1048576)}MB). 유튜브로 추가하세요.` },
      { status: 413 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  // user_id를 경로 첫 세그먼트로 강제(Storage RLS §5.1). 원본은 videos/ 하위(썸네일=thumbs/, §5.6).
  const ext = mime === 'video/quicktime' ? 'mov' : 'mp4';
  const path = `${auth.user.id}/videos/${crypto.randomUUID()}.${ext}`;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? '서명 URL 발급에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
}
