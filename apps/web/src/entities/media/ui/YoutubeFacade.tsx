'use client';

import { useEffect, useRef, useState } from 'react';

import { PlayIcon } from '@/shared/ui';

import { MediaThumb } from './MediaThumb';
import { YoutubeEmbed } from './YoutubeEmbed';

/**
 * YoutubeFacade — 유튜브 썸네일 → 클릭 시 그 자리에서 iframe 재생 (F5 / Design §9.1 ▷ 오버레이).
 *
 * 카드 목록에 iframe을 즉시 여러 개 띄우지 않도록(성능) 기본은 정적 썸네일(MediaThumb)을 보여주고,
 * ▷를 누르면 그제서야 YoutubeEmbed로 교체한다. videoId만 있으면 백엔드 없이 동작.
 * a11y: 교체 시 포커스가 사라지지 않도록 새 플레이어 컨테이너(tabIndex=-1)로 포커스를 옮기고
 * aria-label로 "재생 중" 맥락을 알린다(WCAG 2.4.3). 썸네일 img는 장식(alt="") — 버튼 aria-label이 이름.
 */
export interface YoutubeFacadeProps {
  videoId: string;
  title?: string;
  className?: string;
}

export function YoutubeFacade({ videoId, title, className }: YoutubeFacadeProps) {
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (playing) playerRef.current?.focus();
  }, [playing]);

  if (playing) {
    return (
      <div
        ref={playerRef}
        tabIndex={-1}
        aria-label={title ? `${title} 재생 중` : 'YouTube 영상 재생 중'}
        className="rounded-m outline-none focus-visible:shadow-[var(--ring-focus)]"
      >
        <YoutubeEmbed videoId={videoId} title={title} className={className} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={title ? `${title} 재생` : 'YouTube 영상 재생'}
      className={[
        'relative block w-full rounded-m outline-none focus-visible:shadow-[var(--ring-focus)]',
        className ?? '',
      ].join(' ')}
    >
      {/* 썸네일은 장식(버튼 aria-label이 접근 이름) — 중복 announce 방지. */}
      <MediaThumb kind="youtube" youtubeVideoId={videoId} alt="" />
      {/* 중앙 재생 오버레이(장식). 임의 밝은 썸네일에서도 대비 확보를 위해 70% 흑색 디스크. */}
      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-black/70 text-[var(--text-on-primary)]">
          <PlayIcon width={24} height={24} />
        </span>
      </span>
    </button>
  );
}
