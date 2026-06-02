import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import type { MediaKind } from '@/shared/model/enums';

/**
 * 미디어 재생/조회 데이터 접근 (client) — PRD F5/AC4 / Develop §5.4.
 *
 * 비공개 버킷(training-media)이라 업로드 영상은 **서명 URL**로만 재생한다(공개 URL 금지).
 * RLS(소유자)로 본인 객체만 서명된다 — 인증된 브라우저 클라이언트가 createSignedUrl 호출.
 * 호출부(UploadVideo)는 `enabled: isAuthEnabled() && storagePath` 로 게이팅한다.
 */

/** 표시/연결용 미디어 자산 참조 — media_links→media_assets 평탄화(SessionMediaRef와 동형). */
export interface MediaAssetRef {
  id: string;
  kind: MediaKind;
  youtube_video_id: string | null;
  storage_path: string | null;
  title: string | null;
}

const BUCKET = process.env.NEXT_PUBLIC_MEDIA_BUCKET ?? 'training-media';
/** 서명 URL 만료(초) — T3 기본 10분(재생 세션엔 충분, 공유 누수 최소화). */
export const SIGNED_URL_TTL_SEC = 600;

/** 업로드 영상 storage_path → 재생용 서명 URL(10분). */
export async function fetchSignedMediaUrl(storagePath: string): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
  if (error || !data) throw error ?? new Error('재생 URL 생성에 실패했습니다.');
  return data.signedUrl;
}

/**
 * 한 기술에 연결된 미디어 — 편집 폼 prefill 표시용 (#6-4).
 * `media_links`→`media_assets`(media_id NOT NULL → to-one). RLS로 본인 것만.
 * 업로드 자산은 File로 복원 불가하므로, 폼은 이 참조를 "유지/제거" 토글로만 다룬다(드래프트 아님).
 */
export async function fetchTechniqueMedia(techniqueId: string): Promise<MediaAssetRef[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('media_links')
    .select('media_assets(id, kind, youtube_video_id, storage_path, title)')
    .eq('technique_id', techniqueId);
  if (error) throw error;
  return (data ?? [])
    .map((row) => row.media_assets)
    .filter((m): m is NonNullable<typeof m> => m != null);
}
