// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import { YoutubeEmbed } from '@/entities/media/ui/YoutubeEmbed';
import { buildYoutubeEmbedUrl } from '@/entities/media/lib/youtube';

afterEach(() => cleanup());

const VALID_ID = 'dQw4w9WgXcQ'; // 11-char valid videoId

describe('YoutubeEmbed', () => {
  it('renders an <iframe>', () => {
    const { container } = render(<YoutubeEmbed videoId={VALID_ID} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
  });

  it('iframe src equals buildYoutubeEmbedUrl(videoId)', () => {
    const { container } = render(<YoutubeEmbed videoId={VALID_ID} />);
    const iframe = container.querySelector('iframe');
    expect(iframe?.src).toBe(buildYoutubeEmbedUrl(VALID_ID));
  });

  it('iframe src contains the 11-char videoId', () => {
    const { container } = render(<YoutubeEmbed videoId={VALID_ID} />);
    const iframe = container.querySelector('iframe');
    expect(iframe?.src).toContain(VALID_ID);
  });

  it('iframe src contains youtube.com/embed', () => {
    const { container } = render(<YoutubeEmbed videoId={VALID_ID} />);
    const iframe = container.querySelector('iframe');
    expect(iframe?.src).toContain('youtube.com/embed');
  });

  it('uses default title "YouTube 영상" when title prop omitted', () => {
    const { container } = render(<YoutubeEmbed videoId={VALID_ID} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toHaveAttribute('title', 'YouTube 영상');
  });

  it('uses the provided title prop', () => {
    const { container } = render(
      <YoutubeEmbed videoId={VALID_ID} title="My custom title" />,
    );
    const iframe = container.querySelector('iframe');
    expect(iframe).toHaveAttribute('title', 'My custom title');
  });

  it('iframe has allowFullScreen attribute', () => {
    const { container } = render(<YoutubeEmbed videoId={VALID_ID} />);
    const iframe = container.querySelector('iframe');
    // allowFullScreen is reflected as a boolean attribute in jsdom
    expect(iframe).toHaveAttribute('allowfullscreen');
  });

  it('iframe has referrerPolicy "strict-origin-when-cross-origin"', () => {
    const { container } = render(<YoutubeEmbed videoId={VALID_ID} />);
    const iframe = container.querySelector('iframe');
    // jsdom lowercases the attribute name to 'referrerpolicy'
    expect(iframe).toHaveAttribute(
      'referrerpolicy',
      'strict-origin-when-cross-origin',
    );
  });
});
