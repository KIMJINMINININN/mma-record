import { buildYoutubeEmbedUrl } from '../lib/youtube';

/**
 * YoutubeEmbed — 반응형 16:9 유튜브 인라인 임베드 (F5 / Design §9.1 · Develop §5.6).
 *
 * 표시 전용 순수 컴포넌트(훅 없음) → 서버 컴포넌트로 렌더 가능.
 * URL 원문이 아닌 정규화된 11자 videoId 만 받아 `buildYoutubeEmbedUrl`로 표준 embed URL을 만든다
 * (entities/media/lib/youtube — 재구현 금지, 동일 출처 검증 공유).
 *
 * 보안/성능: `referrerPolicy="strict-origin-when-cross-origin"`, `loading="lazy"`,
 * 최소 권한 `allow` 화이트리스트. 백엔드 불필요 — 인프라 전에도 완전 동작한다(F5 YouTube=live).
 */
export interface YoutubeEmbedProps {
  /** 정규화된 11자 YouTube videoId (URL 아님). */
  videoId: string;
  /** iframe 접근성 title. 생략 시 'YouTube 영상'. */
  title?: string;
  className?: string;
}

export function YoutubeEmbed({ videoId, title, className }: YoutubeEmbedProps) {
  return (
    <div
      className={[
        'aspect-video w-full overflow-hidden rounded-m bg-black',
        className ?? '',
      ].join(' ')}
    >
      <iframe
        src={buildYoutubeEmbedUrl(videoId)}
        title={title ?? 'YouTube 영상'}
        loading="lazy"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        className="h-full w-full border-0"
      />
    </div>
  );
}
