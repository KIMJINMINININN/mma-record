'use client';

/**
 * VideoPlayer — 업로드 클립 인앱 재생기 (F5 / Design §9.1 · Develop §5.4).
 *
 * 최소 HTML5 <video> 플레이어. **인프라 후에만** 사용한다(src = 서명 URL).
 * 'use client'인 이유: <video> 자체는 SSR 가능하나, 향후 재생 상태/이벤트 훅을 이 경계 안에
 * 둘 자리를 미리 확보(F5 셸 → 인프라 점진 확장). 표시 props만으로도 동작한다.
 *
 * NOTE(infra): src는 createSignedUrl(10분) 산출물 — 공개 URL 금지(PRD F5/AC4).
 */
export interface VideoPlayerProps {
  /** 재생 소스. 인프라 후 createSignedUrl(path, 600) 산출 서명 URL. 공개 URL 금지. */
  src: string;
  /** 포스터(썸네일) — 있으면 로드 전 표시. */
  poster?: string | null;
  className?: string;
}

export function VideoPlayer({ src, poster, className }: VideoPlayerProps) {
  return (
    <video
      controls
      preload="metadata"
      poster={poster ?? undefined}
      src={src}
      className={[
        'aspect-video w-full rounded-m bg-black',
        className ?? '',
      ].join(' ')}
    />
  );
}
