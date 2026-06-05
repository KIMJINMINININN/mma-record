import type { SVGProps } from 'react';

import type { MediaKind } from '@/shared/model/enums';

import { buildYoutubeThumbnailUrl } from '../lib/youtube';
import { domainAvatar } from '../lib/url';

/**
 * MediaThumb — 미디어 썸네일 타일 (F5 / Design §9.1).
 *
 * kind별 표시 규약:
 *  - youtube  → 유튜브 기본 썸네일(`buildYoutubeThumbnailUrl`) + 우상단 "▶ YouTube" 배지.
 *  - upload   → thumbnailUrl 있으면 <img>, 없으면 중립 placeholder("내 영상");
 *               durationSec 있으면 우하단 길이 배지(0:42).
 *  - external → 🔗 링크 placeholder.
 *
 * 항상 `aspect-video rounded-m`, <img>는 `object-cover`·`loading="lazy"`·`alt` 보장.
 * 표시 전용 순수 컴포넌트 → 서버 컴포넌트. (이미지는 임의 user-content/외부 호스트라
 * next/image 부적합 — 의도적 raw <img>, 동일 판단을 TechniqueCard도 공유.)
 */
export interface MediaThumbProps {
  kind: MediaKind;
  /** kind='youtube'일 때 11자 videoId. 없으면 placeholder로 흐름. */
  youtubeVideoId?: string | null;
  /** kind='upload'일 때 썸네일 URL(인프라 후 서명 URL, 프리뷰 단계는 object-URL). */
  thumbnailUrl?: string | null;
  /** 업로드 길이(초) — 있으면 우하단 길이 배지. */
  durationSec?: number | null;
  /** kind='upload' 썸네일 부재 시 placeholder 라벨. 기본 '내 영상'(사진이면 '내 사진' 등). */
  uploadLabel?: string;
  /** kind='external'일 때 호스트(도메인 아바타·라벨용). 없으면 🔗 placeholder. */
  host?: string | null;
  alt?: string;
  className?: string;
}

/** 초 → 'm:ss' 표기 (0:42, 1:05). 음수/NaN은 0:00. */
export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 카메라/필름 글리프 — placeholder용(공용 아이콘셋에 미디어 아이콘 없음, currentColor 상속). */
function MediaGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="3" y="5" width="14" height="14" rx="2.5" />
      <path d="M17 10l4-2.5v9L17 14" />
    </svg>
  );
}

/** 타일 공통 셸 — aspect-video rounded-m overflow-hidden. */
const TILE_BASE = 'relative aspect-video w-full overflow-hidden rounded-m bg-[var(--surface-sunken)]';

export function MediaThumb({
  kind,
  youtubeVideoId = null,
  thumbnailUrl = null,
  durationSec = null,
  uploadLabel = '내 영상',
  host = null,
  alt,
  className,
}: MediaThumbProps) {
  const cls = [TILE_BASE, className ?? ''].join(' ');

  // ── youtube: 기본 썸네일 + ▶ YouTube 배지 (videoId 있을 때만 <img>) ──
  if (kind === 'youtube') {
    return (
      <div className={cls}>
        {youtubeVideoId ? (
          // eslint-disable-next-line @next/next/no-img-element -- 외부(img.youtube.com) 호스트, next/image 부적합
          <img
            src={buildYoutubeThumbnailUrl(youtubeVideoId)}
            alt={alt ?? 'YouTube 썸네일'}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <PlaceholderBody label="YouTube" />
        )}
        <span className="absolute right-1.5 top-1.5 rounded-xxs bg-[var(--primary)] px-1.5 py-0.5 text-button-xs text-[var(--text-on-primary)]">
          <span aria-hidden="true">▶</span> YouTube
        </span>
      </div>
    );
  }

  // ── upload: 썸네일 있으면 <img>, 없으면 "내 영상" placeholder + 길이 배지 ──
  if (kind === 'upload') {
    return (
      <div className={cls}>
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- object-URL/서명 URL, next/image 부적합
          <img
            src={thumbnailUrl}
            alt={alt ?? '내 영상 썸네일'}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <PlaceholderBody label={uploadLabel} />
        )}
        {durationSec != null && (
          <span className="absolute bottom-1.5 right-1.5 rounded-xxs bg-black/70 px-1.5 py-0.5 text-button-xs text-white tabular-nums">
            {formatDuration(durationSec)}
          </span>
        )}
      </div>
    );
  }

  // ── external: 도메인 아바타(첫글자 + host 해시 색) + 도메인 라벨. host 없으면 🔗 placeholder. ──
  const avatar = host ? domainAvatar(host) : null;
  return (
    <div className={cls}>
      {avatar ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full text-body-m-400 text-white"
            style={{ backgroundColor: `hsl(${avatar.hue} 55% 42%)` }}
          >
            {avatar.letter}
          </span>
          <span className="max-w-full truncate text-body-xs-400 text-[var(--text-muted)]">
            {avatar.label}
          </span>
        </div>
      ) : (
        <PlaceholderBody label="외부 링크" glyph="🔗" />
      )}
      <span className="absolute right-1.5 top-1.5 rounded-xxs bg-[var(--surface-raised)] px-1.5 py-0.5 text-button-xs text-[var(--text-muted)]">
        <span aria-hidden="true">↗</span> 링크
      </span>
    </div>
  );
}

/** 썸네일 부재 시 중립 placeholder 본문 (글리프 + 라벨). */
function PlaceholderBody({ label, glyph }: { label: string; glyph?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[var(--text-disabled)]">
      {glyph ? (
        <span aria-hidden="true" className="text-[20px] leading-none">
          {glyph}
        </span>
      ) : (
        <MediaGlyph />
      )}
      <span className="text-body-xs-400">{label}</span>
    </div>
  );
}
