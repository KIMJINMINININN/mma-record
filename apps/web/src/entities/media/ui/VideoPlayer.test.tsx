// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';

import { VideoPlayer } from '@/entities/media/ui/VideoPlayer';
import {
  readPlaybackProgress,
  savePlaybackProgress,
  uploadResumeKey,
} from '@/entities/media/model/playback-progress';

afterEach(() => cleanup());

const TEST_SRC = 'https://example.com/clip.mp4';
const TEST_POSTER = 'https://example.com/poster.jpg';
const RESUME_KEY = uploadResumeKey('user-1/videos/abc.mp4');

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

// 이어보기 — 저장 위치가 있으면 첫 재생에서 "이어보기 / 처음부터"를 묻고, 재생 중엔 위치를 기억한다.
describe('VideoPlayer 이어보기', () => {
  beforeAll(() => {
    // jsdom은 미디어 재생을 구현하지 않는다(play/pause → Not implemented) → 스텁.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  beforeEach(() => localStorage.clear());

  /** 저장 위치가 심어진 플레이어를 렌더하고 첫 재생을 발생시킨다. */
  function renderAndPlay(opts?: { resumeKey?: string; at?: number }) {
    const { container } = render(
      <VideoPlayer src={TEST_SRC} resumeKey={opts?.resumeKey ?? RESUME_KEY} />,
    );
    const video = container.querySelector('video') as HTMLVideoElement;
    if (opts?.at !== undefined) video.currentTime = opts.at;
    fireEvent.play(video);
    return video;
  }

  it('저장된 위치가 있으면 첫 재생에서 팝업으로 위치와 두 선택지를 보여준다', () => {
    savePlaybackProgress(RESUME_KEY, 125, 300);
    const video = renderAndPlay();

    expect(screen.getByText('2:05')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이어보기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '처음부터' })).toBeInTheDocument();
    expect(video.pause).toHaveBeenCalled(); // 고르는 동안 멈춰 있어야 한다
  });

  it('재생 전에는 팝업이 없다(볼 의사가 있을 때만 묻는다)', () => {
    savePlaybackProgress(RESUME_KEY, 125, 300);
    render(<VideoPlayer src={TEST_SRC} resumeKey={RESUME_KEY} />);
    expect(screen.queryByRole('button', { name: '이어보기' })).toBeNull();
  });

  it('저장된 위치가 없으면 묻지 않는다', () => {
    renderAndPlay();
    expect(screen.queryByRole('button', { name: '이어보기' })).toBeNull();
  });

  it('resumeKey가 없으면(순수 표시 모드) 저장 위치가 있어도 묻지 않는다', () => {
    savePlaybackProgress(RESUME_KEY, 125, 300);
    const { container } = render(<VideoPlayer src={TEST_SRC} />);
    fireEvent.play(container.querySelector('video') as HTMLVideoElement);
    expect(screen.queryByRole('button', { name: '이어보기' })).toBeNull();
  });

  it('이미 앞으로 이동한 뒤 재생하면(스크럽) 묻지 않는다', () => {
    savePlaybackProgress(RESUME_KEY, 125, 300);
    renderAndPlay({ at: 60 });
    expect(screen.queryByRole('button', { name: '이어보기' })).toBeNull();
  });

  it('한 번 고른 뒤 다시 재생해도 되묻지 않는다', () => {
    savePlaybackProgress(RESUME_KEY, 125, 300);
    const video = renderAndPlay();
    fireEvent.click(screen.getByRole('button', { name: '이어보기' }));

    video.currentTime = 0;
    fireEvent.play(video);
    expect(screen.queryByRole('button', { name: '이어보기' })).toBeNull();
  });

  it('이어보기 → 팝업이 닫히고 저장 위치로 이동·재생, 위치는 유지', () => {
    savePlaybackProgress(RESUME_KEY, 125, 300);
    const video = renderAndPlay();

    fireEvent.click(screen.getByRole('button', { name: '이어보기' }));

    expect(screen.queryByRole('button', { name: '이어보기' })).toBeNull();
    expect(video.play).toHaveBeenCalled();
    // jsdom은 readyState=0(metadata 전) → loadedmetadata 후에 seek 된다.
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(125);
    expect(readPlaybackProgress(RESUME_KEY)?.t).toBe(125);
  });

  it('처음부터 → 팝업이 닫히고 저장 위치가 지워진다', () => {
    savePlaybackProgress(RESUME_KEY, 125, 300);
    const video = renderAndPlay();

    fireEvent.click(screen.getByRole('button', { name: '처음부터' }));

    expect(screen.queryByRole('button', { name: '처음부터' })).toBeNull();
    expect(readPlaybackProgress(RESUME_KEY)).toBeNull();
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(0);
  });

  it('재생 중 timeupdate가 위치를 저장한다', () => {
    const { container } = render(<VideoPlayer src={TEST_SRC} resumeKey={RESUME_KEY} />);
    const video = container.querySelector('video') as HTMLVideoElement;

    video.currentTime = 90;
    fireEvent.timeUpdate(video);

    expect(readPlaybackProgress(RESUME_KEY)?.t).toBe(90);
  });

  it('끝까지 재생(ended)하면 저장 위치를 지운다', () => {
    savePlaybackProgress(RESUME_KEY, 125, 300);
    const { container } = render(<VideoPlayer src={TEST_SRC} resumeKey={RESUME_KEY} />);
    const video = container.querySelector('video') as HTMLVideoElement;

    fireEvent.ended(video);

    expect(readPlaybackProgress(RESUME_KEY)).toBeNull();
  });

  it('언마운트 시 저장 간격에 못 미친 마지막 위치까지 저장한다(페이지 전환)', () => {
    const { container, unmount } = render(
      <VideoPlayer src={TEST_SRC} resumeKey={RESUME_KEY} />,
    );
    const video = container.querySelector('video') as HTMLVideoElement;

    video.currentTime = 42;
    fireEvent.timeUpdate(video); // 42 저장(간격 충족)
    video.currentTime = 44;
    fireEvent.timeUpdate(video); // 간격 미달 → 아직 저장 안 됨
    expect(readPlaybackProgress(RESUME_KEY)?.t).toBe(42);

    unmount();

    expect(readPlaybackProgress(RESUME_KEY)?.t).toBe(44);
  });
});
