// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, within, cleanup } from '@testing-library/react';

import { MediaThumb, formatDuration } from '@/entities/media/ui/MediaThumb';
import { buildYoutubeThumbnailUrl } from '@/entities/media/lib/youtube';

afterEach(() => cleanup());

const VALID_ID = 'dQw4w9WgXcQ';

// ─── formatDuration unit tests ───────────────────────────────────────────────
describe('formatDuration', () => {
  it('0 → "0:00"', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('5 → "0:05"', () => {
    expect(formatDuration(5)).toBe('0:05');
  });

  it('65 → "1:05"', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  it('negative → "0:00"', () => {
    expect(formatDuration(-1)).toBe('0:00');
  });

  it('NaN → "0:00"', () => {
    expect(formatDuration(NaN)).toBe('0:00');
  });

  it('60 → "1:00"', () => {
    expect(formatDuration(60)).toBe('1:00');
  });

  it('3661 → "61:01"', () => {
    expect(formatDuration(3661)).toBe('61:01');
  });
});

// ─── MediaThumb kind='youtube' ───────────────────────────────────────────────
describe('MediaThumb kind="youtube"', () => {
  it('renders thumbnail img with src from buildYoutubeThumbnailUrl when videoId given', () => {
    const { container } = render(
      <MediaThumb kind="youtube" youtubeVideoId={VALID_ID} />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.src).toBe(buildYoutubeThumbnailUrl(VALID_ID));
  });

  it('thumbnail img src contains the videoId', () => {
    const { container } = render(
      <MediaThumb kind="youtube" youtubeVideoId={VALID_ID} />,
    );
    const img = container.querySelector('img');
    expect(img?.src).toContain(VALID_ID);
  });

  // 배지의 ▶는 장식(aria-hidden span)이라 텍스트가 두 노드로 분리됨 → 배지 span의 합성 textContent로 매칭.
  const youtubeBadge = (container: HTMLElement) =>
    within(container).getByText(
      (_content, el) =>
        el?.tagName === 'SPAN' &&
        el.className.includes('absolute') &&
        el.textContent === '▶ YouTube',
    );

  it('shows YouTube badge text "▶ YouTube"', () => {
    const { container } = render(
      <MediaThumb kind="youtube" youtubeVideoId={VALID_ID} />,
    );
    expect(youtubeBadge(container)).toBeTruthy();
  });

  it('shows YouTube badge even without videoId (placeholder path)', () => {
    const { container } = render(
      <MediaThumb kind="youtube" youtubeVideoId={null} />,
    );
    expect(youtubeBadge(container)).toBeTruthy();
  });

  it('marks the badge ▶ glyph as decorative (aria-hidden)', () => {
    const { container } = render(
      <MediaThumb kind="youtube" youtubeVideoId={VALID_ID} />,
    );
    const glyph = within(container).getByText('▶');
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows placeholder label "YouTube" when videoId is null', () => {
    const { container } = render(
      <MediaThumb kind="youtube" youtubeVideoId={null} />,
    );
    // 배지에도 "YouTube"가 있으므로 placeholder 본문 라벨(span.text-body-xs-400)로 한정.
    expect(
      within(container).getByText('YouTube', { selector: 'span.text-body-xs-400' }),
    ).toBeTruthy();
  });

  it('does not render an img when videoId is null', () => {
    const { container } = render(
      <MediaThumb kind="youtube" youtubeVideoId={null} />,
    );
    expect(container.querySelector('img')).toBeNull();
  });
});

// ─── MediaThumb kind='upload' ────────────────────────────────────────────────
describe('MediaThumb kind="upload"', () => {
  it('renders thumbnail img when thumbnailUrl provided', () => {
    const url = 'https://example.com/thumb.jpg';
    const { container } = render(
      <MediaThumb kind="upload" thumbnailUrl={url} />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.src).toBe(url);
  });

  it('renders placeholder label "내 영상" when thumbnailUrl is null', () => {
    const { container } = render(
      <MediaThumb kind="upload" thumbnailUrl={null} />,
    );
    expect(within(container).getByText('내 영상')).toBeTruthy();
  });

  it('shows duration badge with formatted durationSec=0 → "0:00"', () => {
    const { container } = render(<MediaThumb kind="upload" durationSec={0} />);
    expect(within(container).getByText('0:00')).toBeTruthy();
  });

  it('shows duration badge with formatted durationSec=5 → "0:05"', () => {
    const { container } = render(<MediaThumb kind="upload" durationSec={5} />);
    expect(within(container).getByText('0:05')).toBeTruthy();
  });

  it('shows duration badge with formatted durationSec=65 → "1:05"', () => {
    const { container } = render(
      <MediaThumb kind="upload" durationSec={65} />,
    );
    expect(within(container).getByText('1:05')).toBeTruthy();
  });

  it('does not render duration badge when durationSec is null', () => {
    const { container } = render(
      <MediaThumb kind="upload" durationSec={null} />,
    );
    // Duration badge has class 'tabular-nums'; PlaceholderBody span does not.
    expect(container.querySelector('.tabular-nums')).toBeNull();
  });

  it('does not render duration badge when durationSec is omitted', () => {
    const { container } = render(<MediaThumb kind="upload" />);
    expect(container.querySelector('.tabular-nums')).toBeNull();
  });
});

// ─── MediaThumb kind='external' ──────────────────────────────────────────────
describe('MediaThumb kind="external"', () => {
  it('renders the external link placeholder label "외부 링크"', () => {
    const { container } = render(<MediaThumb kind="external" />);
    expect(within(container).getByText('외부 링크')).toBeTruthy();
  });

  it('renders the 🔗 glyph', () => {
    const { container } = render(<MediaThumb kind="external" />);
    // glyph is in an aria-hidden <span>
    expect(within(container).getByText('🔗')).toBeTruthy();
  });

  it('does not render an img', () => {
    const { container } = render(<MediaThumb kind="external" />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('does not render duration badge', () => {
    const { container } = render(<MediaThumb kind="external" />);
    // No <span> with time format pattern
    const spans = Array.from(container.querySelectorAll('span'));
    const hasDuration = spans.some((s) => /^\d+:\d{2}$/.test(s.textContent ?? ''));
    expect(hasDuration).toBe(false);
  });
});
