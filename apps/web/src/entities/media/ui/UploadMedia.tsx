'use client';

import { useQuery } from '@tanstack/react-query';

import { isAuthEnabled } from '@/shared/api/supabase/env';

import { fetchSignedMediaUrl, SIGNED_URL_TTL_SEC } from '../api/media-queries';
import { isImageStoragePath } from '../lib/url';
import { UploadVideo } from './UploadVideo';

/**
 * UploadMedia — 업로드 자산(kind='upload') 표시 디스패처 (F5 / E 트랙).
 *
 * storage_path가 `images/`면 사진(서명 URL <img>), 아니면 영상(UploadVideo→VideoPlayer).
 * 영상/이미지는 별도 mime 컬럼 없이 경로 세그먼트로 구분한다([[isImageStoragePath]]).
 * 비공개 버킷이라 사진도 서명 URL로만 표시(공개 URL 금지) — UploadVideo와 동일한 지연 발급/캐시 정책.
 */
export interface UploadMediaProps {
  storagePath: string;
  /** 영상 첫프레임 썸네일(영상에만 의미 — 이미지는 원본 자체 표시). */
  thumbnailPath?: string | null;
  className?: string;
  alt?: string;
}

/** aspect-video 자리 채움 박스(로딩/에러 공통, UploadVideo와 동일 톤). */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-m bg-[var(--surface-sunken)] text-body-xs-400 text-[var(--text-disabled)]">
      {children}
    </div>
  );
}

export function UploadMedia({ storagePath, thumbnailPath, className, alt }: UploadMediaProps) {
  // UploadMedia 자체는 훅을 쓰지 않으므로(분기 후 자식이 각자 훅 호출) 조건부 렌더가 안전하다.
  if (!isImageStoragePath(storagePath)) {
    return <UploadVideo storagePath={storagePath} thumbnailPath={thumbnailPath} className={className} />;
  }
  return <UploadImage storagePath={storagePath} className={className} alt={alt} />;
}

function UploadImage({ storagePath, className, alt }: { storagePath: string; className?: string; alt?: string }) {
  const { data: src, isError } = useQuery({
    queryKey: ['media', 'signed', storagePath],
    queryFn: () => fetchSignedMediaUrl(storagePath),
    enabled: isAuthEnabled() && storagePath !== '',
    staleTime: (SIGNED_URL_TTL_SEC - 60) * 1000,
  });

  if (isError) return <Frame>사진을 불러올 수 없습니다</Frame>;
  if (!src) return <Frame>사진 불러오는 중…</Frame>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 서명 URL(비공개 버킷), next/image 부적합
    <img
      src={src}
      alt={alt ?? '내 사진'}
      loading="lazy"
      className={['aspect-video w-full rounded-m bg-black object-contain', className ?? ''].join(' ')}
    />
  );
}
