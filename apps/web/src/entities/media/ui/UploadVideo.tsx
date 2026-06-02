'use client';

import { useQuery } from '@tanstack/react-query';

import { isAuthEnabled } from '@/shared/api/supabase/env';
import { fetchSignedMediaUrl, SIGNED_URL_TTL_SEC } from '../api/media-queries';
import { VideoPlayer } from './VideoPlayer';

/**
 * UploadVideo — 업로드 영상 인앱 재생(서명 URL 지연 발급, F5/AC4 / #6-3b).
 *
 * storage_path만 받아 필요할 때 서명 URL을 발급(useQuery)해 VideoPlayer에 넘긴다 —
 * 목록 쿼리가 모든 영상의 서명 URL을 미리 만들지 않도록 표시 시점으로 미룬다.
 * staleTime을 TTL보다 짧게 둬 만료 전 동일 path 재사용 + 만료 시 자동 재발급.
 * AUTH OFF면 비활성(미디어 자체가 인프라 후 생성) → 안내 placeholder.
 */
export interface UploadVideoProps {
  storagePath: string;
  poster?: string | null;
  className?: string;
}

/** aspect-video 자리 채움 박스(로딩/에러 공통). */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-m bg-[var(--surface-sunken)] text-body-xs-400 text-[var(--text-disabled)]">
      {children}
    </div>
  );
}

export function UploadVideo({ storagePath, poster, className }: UploadVideoProps) {
  const { data: src, isError } = useQuery({
    queryKey: ['media', 'signed', storagePath],
    queryFn: () => fetchSignedMediaUrl(storagePath),
    enabled: isAuthEnabled() && storagePath !== '',
    // TTL(10분)보다 짧게 — 만료 전 재사용, 만료 후 재발급.
    staleTime: (SIGNED_URL_TTL_SEC - 60) * 1000,
  });

  if (isError) return <Frame>영상을 불러올 수 없습니다</Frame>;
  if (!src) return <Frame>영상 불러오는 중…</Frame>;
  return <VideoPlayer src={src} poster={poster} className={className} />;
}
