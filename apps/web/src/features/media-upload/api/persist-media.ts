import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import type { MediaAssetInsert } from '@/entities/media';

import type { MediaDraft } from '../model/media-draft';
import { captureFirstFrame } from '../model/capture-thumbnail';
import { createMediaAssets } from './media-asset-actions';

/**
 * MediaDraft[] → media_assets id[] 영속화 (F5 / #6-3, 클라이언트 오케스트레이션).
 *
 * 흐름(브라우저):
 *  - youtube: videoId만 메타로 (업로드 없음).
 *  - upload: POST /api/media/sign-upload(서명 URL) → storage.uploadToSignedUrl(PUT) → storage_path+메타.
 * 그런 다음 createMediaAssets(서버 액션, user_id 강제)로 행을 만들고 id를 모아 돌려준다.
 * 호출부(SessionEditorForm)는 받은 id를 logSession media:[{media_id}]로 넘긴다(RPC가 media_links 연결).
 *
 * media_assets/업로드는 logSession 트랜잭션 밖이라, 이후 logSession 실패 시 미연결 자산이 남을 수 있다
 * (재사용 가능한 자원이라 무해 — 태그 resolveTagIds와 동일한 트레이드오프).
 */

const BUCKET = process.env.NEXT_PUBLIC_MEDIA_BUCKET ?? 'training-media';

export async function persistMediaDrafts(drafts: MediaDraft[]): Promise<string[]> {
  if (drafts.length === 0) return [];

  const supabase = createSupabaseBrowserClient();
  const inputs: MediaAssetInsert[] = [];

  for (const draft of drafts) {
    if (draft.kind === 'youtube') {
      inputs.push({
        kind: 'youtube',
        youtube_video_id: draft.videoId,
        storage_path: null,
        external_url: null,
        duration_sec: null,
        size_bytes: null,
        thumbnail_path: null,
        title: null,
      });
      continue;
    }

    if (draft.kind === 'external') {
      // 메타 행만(업로드 없음). external_url은 picker에서 이미 http(s) 안전화됨.
      inputs.push({
        kind: 'external',
        external_url: draft.url,
        storage_path: null,
        youtube_video_id: null,
        duration_sec: null,
        size_bytes: null,
        thumbnail_path: null,
        title: draft.title,
      });
      continue;
    }

    // upload: 서명 URL 발급(서버 한도 재확인) → 브라우저에서 직접 PUT.
    const res = await fetch('/api/media/sign-upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: draft.file.name,
        size: draft.sizeBytes,
        mime: draft.mime,
        duration: draft.durationSec,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? '업로드 URL 발급에 실패했습니다.');
    }
    const { path, token } = (await res.json()) as { path: string; token: string };

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .uploadToSignedUrl(path, token, draft.file);
    if (upErr) throw upErr;

    // 첫프레임 썸네일(F5-AC5) — 캡처→thumbs/ 업로드. 실패해도 영상 저장은 유지(thumbnail_path=null).
    let thumbnailPath: string | null = null;
    try {
      const thumbBlob = await captureFirstFrame(draft.file);
      if (thumbBlob) {
        const tRes = await fetch('/api/media/sign-upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            filename: 'thumb.jpg',
            size: thumbBlob.size,
            mime: 'image/jpeg',
            kind: 'thumbnail',
          }),
        });
        if (tRes.ok) {
          const { path: tPath, token: tToken } = (await tRes.json()) as { path: string; token: string };
          const { error: tErr } = await supabase.storage.from(BUCKET).uploadToSignedUrl(tPath, tToken, thumbBlob);
          if (!tErr) thumbnailPath = tPath;
        }
      }
    } catch {
      // 썸네일 실패는 무시 — 영상 자체 저장에는 영향 없음.
    }

    inputs.push({
      kind: 'upload',
      storage_path: path,
      youtube_video_id: null,
      external_url: null,
      duration_sec: draft.durationSec,
      size_bytes: draft.sizeBytes,
      thumbnail_path: thumbnailPath,
      title: draft.file.name,
    });
  }

  const result = await createMediaAssets(inputs);
  if (!result.ok) throw new Error(result.error);
  return result.ids;
}
