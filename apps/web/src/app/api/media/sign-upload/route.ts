import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isAuthEnabled } from '@/shared/api/supabase/env';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { createSupabaseAdminClient } from '@/shared/api/supabase/admin';

/**
 * POST /api/media/sign-upload — 서명 업로드 URL 발급 (F5 / Develop §5.3·§5.4·§5.5).
 *
 * 두 대상(kind): 'video'(원본, videos/) | 'thumbnail'(업로드 영상 첫프레임 캡처 JPEG, thumbs/, F5-AC5).
 * 도먼시(인프라 last): `isAuthEnabled()` false면 stale/부재 secret 키로 admin client를 만들지 않고 503.
 * 이중 방어(Develop §5.3): 바디 Zod 검증 + kind별 mime/한도 재확인 → 인증 → user_id를 경로 첫 세그먼트로
 * 강제(Storage RLS §5.1) → admin client로 createSignedUploadUrl. 브라우저는 받은 URL로 직접 PUT.
 *
 * SSoT: docs/mma/Develop.md §5.3 / §5.4 / §5.1 / §5.5
 */

const bodySchema = z.object({
  // filename: 형태만 검증 — 경로에 절대 사용 안 함(경로주입 방지).
  filename: z.string().min(1).max(255),
  size: z.number().int().positive(),
  mime: z.string().min(1),
  duration: z.number().int().positive().nullable().optional(),
  /** 업로드 대상. 기본 'video'(원본). 'thumbnail'은 첫프레임 캡처 이미지. */
  kind: z.enum(['video', 'thumbnail']).optional().default('video'),
});

const MAX_BYTES = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_BYTES ?? 104857600);
const MAX_DURATION = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_DURATION_SEC ?? 60);
const BUCKET = process.env.NEXT_PUBLIC_MEDIA_BUCKET ?? 'training-media';
/** 썸네일(캡처 JPEG) 용량 상한 — 캡처물은 보통 수백 KB라 넉넉히 5MB. */
const THUMB_MAX_BYTES = 5 * 1024 * 1024;

const VIDEO_EXT: Record<string, string> = { 'video/mp4': 'mp4', 'video/quicktime': 'mov' };
const THUMB_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

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
  const { size, mime, duration, kind } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  // kind별 mime/한도 검증 + 경로(첫 세그먼트=user_id, Storage RLS §5.1).
  let path: string;
  if (kind === 'thumbnail') {
    const ext = THUMB_EXT[mime];
    if (!ext) {
      return NextResponse.json({ error: '지원하지 않는 썸네일 형식입니다.' }, { status: 400 });
    }
    if (size > THUMB_MAX_BYTES) {
      return NextResponse.json({ error: '썸네일 용량이 너무 큽니다.' }, { status: 413 });
    }
    path = `${auth.user.id}/thumbs/${crypto.randomUUID()}.${ext}`;
  } else {
    const ext = VIDEO_EXT[mime];
    if (!ext) {
      return NextResponse.json({ error: 'mp4 또는 mov 영상만 업로드할 수 있습니다.' }, { status: 400 });
    }
    if (size > MAX_BYTES || (duration != null && duration > MAX_DURATION)) {
      return NextResponse.json(
        { error: `한도 초과(≤${MAX_DURATION}초/≤${Math.round(MAX_BYTES / 1048576)}MB). 유튜브로 추가하세요.` },
        { status: 413 },
      );
    }
    path = `${auth.user.id}/videos/${crypto.randomUUID()}.${ext}`;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? '서명 URL 발급에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
}
