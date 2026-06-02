// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import { VideoPlayer } from '@/entities/media/ui/VideoPlayer';

afterEach(() => cleanup());

const TEST_SRC = 'https://example.com/clip.mp4';
const TEST_POSTER = 'https://example.com/poster.jpg';

describe('VideoPlayer', () => {
  it('renders a <video> element', () => {
    const { container } = render(<VideoPlayer src={TEST_SRC} />);
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
  });

  it('video has controls attribute', () => {
    const { container } = render(<VideoPlayer src={TEST_SRC} />);
    const video = container.querySelector('video');
    expect(video).toHaveAttribute('controls');
  });

  it('video src matches the given src prop', () => {
    const { container } = render(<VideoPlayer src={TEST_SRC} />);
    const video = container.querySelector('video');
    expect(video?.src).toBe(TEST_SRC);
  });

  it('video has no poster attribute when poster prop omitted', () => {
    const { container } = render(<VideoPlayer src={TEST_SRC} />);
    const video = container.querySelector('video');
    // poster prop is undefined → source passes undefined → React omits the attribute
    expect(video).not.toHaveAttribute('poster');
  });

  it('video has no poster attribute when poster prop is null', () => {
    const { container } = render(<VideoPlayer src={TEST_SRC} poster={null} />);
    const video = container.querySelector('video');
    expect(video).not.toHaveAttribute('poster');
  });

  it('video poster attribute matches the given poster prop', () => {
    const { container } = render(
      <VideoPlayer src={TEST_SRC} poster={TEST_POSTER} />,
    );
    const video = container.querySelector('video');
    expect(video?.poster).toBe(TEST_POSTER);
  });
});
