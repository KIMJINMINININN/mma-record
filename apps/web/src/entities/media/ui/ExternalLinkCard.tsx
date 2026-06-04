import { MediaThumb } from './MediaThumb';
import { safeExternalUrl, urlHost } from '../lib/url';

/**
 * ExternalLinkCard — 외부 참고 링크 카드 (F5 external / Design §9.1 '새 탭/외부').
 *
 * external_url을 스킴 한정(http/https)으로 안전화한 뒤 새 탭 앵커로 연다(rel=noopener noreferrer).
 * 안전하지 않은 URL이면 렌더하지 않는다(이전엔 두 소비자가 external을 그냥 null로 버렸음).
 * 표시 전용 → 서버 컴포넌트(앵커만, 훅 없음).
 */
export interface ExternalLinkCardProps {
  url: string;
  title?: string | null;
  className?: string;
}

export function ExternalLinkCard({ url, title, className }: ExternalLinkCardProps) {
  const safe = safeExternalUrl(url);
  if (!safe) return null;
  const host = urlHost(safe);
  const a11yLabel = title?.trim() || host || safe;
  // 표시 caption 은 제목만 — 도메인은 타일(MediaThumb 도메인 아바타 라벨)에 이미 있어 중복을 피한다.
  const caption = title?.trim() || null;

  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${a11yLabel} (새 탭에서 열림)`}
      className={[
        'block rounded-m outline-none focus-visible:shadow-[var(--ring-focus)]',
        className ?? '',
      ].join(' ')}
    >
      <MediaThumb kind="external" host={host} />
      {caption && (
        <p className="mt-1 truncate text-body-xs-400 text-[var(--text-muted)]" title={caption}>
          {caption}
        </p>
      )}
    </a>
  );
}
