'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/ui';

import {
  clearPlaybackProgress,
  MIN_RESUME_SEC,
  readPlaybackProgress,
  savePlaybackProgress,
} from '../model/playback-progress';
import { formatDuration } from './MediaThumb';

/**
 * VideoPlayer — 업로드 클립 인앱 재생기 (F5 / Design §9.1 · Develop §5.4).
 *
 * HTML5 <video> + **이어보기**. `resumeKey`를 주면 재생 위치를 기기에 기억해, 다시 재생할 때
 * "이어보기 / 처음부터"를 묻는다(저장 규칙은 model/playback-progress).
 * 키가 없으면 예전처럼 순수 표시 컴포넌트로 동작한다.
 *
 * 묻는 시점 = **첫 재생(play 이벤트)**. 마운트 시 오버레이를 띄우면 localStorage를 렌더 경로에서
 * 읽어야 해 hydration 불일치·effect 내 setState를 부르고, 볼 의사가 없는 카드에도 팝업이 뜬다.
 *
 * NOTE(infra): src는 createSignedUrl(10분) 산출물 — 공개 URL 금지(PRD F5/AC4).
 *   서명 URL이 갱신되면 <video>가 0초부터 리로드되므로, 그 경우엔 묻지 않고 보던 자리로 되돌린다.
 */
export interface VideoPlayerProps {
  /** 재생 소스. 인프라 후 createSignedUrl(path, 600) 산출 서명 URL. 공개 URL 금지. */
  src: string;
  /** 포스터(썸네일) — 있으면 로드 전 표시. */
  poster?: string | null;
  /**
   * 이어보기 식별 키(불변). 있으면 위치 기억 + 재개 팝업.
   * 매번 바뀌는 서명 URL이 아니라 storage_path 기반 키를 넘긴다(uploadResumeKey).
   */
  resumeKey?: string;
  className?: string;
}

/** 위치 저장 간격(초) — timeupdate는 초당 4회쯤 오므로 이 간격으로 솎아 쓴다. */
const SAVE_INTERVAL_SEC = 5;

/** 재생 시도 — 자동재생 정책상 거부될 수 있고(그 경우 컨트롤로 재생), jsdom에선 Promise가 아니다. */
function tryPlay(el: HTMLVideoElement): void {
  void Promise.resolve(el.play()).catch(() => {});
}

/** metadata 전엔 currentTime 설정이 무시될 수 있어 로드 후로 미룬다. */
function seek(el: HTMLVideoElement, sec: number): void {
  if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
    el.currentTime = sec;
    return;
  }
  el.addEventListener(
    'loadedmetadata',
    () => {
      el.currentTime = sec;
    },
    { once: true },
  );
}

/**
 * 전체화면 재생 중인가 — iOS는 표준 Fullscreen API 대신 네이티브 플레이어를 띄워
 * `document.fullscreenElement`가 null이므로 webkit 플래그도 함께 본다.
 * 전체화면에선 우리 오버레이가 가려 보이지 않으므로 묻지 않고 조용히 이어본다.
 */
function isFullscreenVideo(el: HTMLVideoElement): boolean {
  const { webkitDisplayingFullscreen } = el as HTMLVideoElement & {
    webkitDisplayingFullscreen?: boolean;
  };
  // Fullscreen API 미구현 환경(구형 WebView·jsdom)에선 undefined → 참/거짓으로 판정한다.
  return Boolean(document.fullscreenElement) || webkitDisplayingFullscreen === true;
}

export function VideoPlayer({ src, poster, resumeKey, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  /** 팝업에 제시할 저장 위치(초). null = 팝업 없음. */
  const [promptAt, setPromptAt] = useState<number | null>(null);
  /** 이번 마운트에서 이어보기 여부를 이미 판단했는가 — 재생/일시정지를 반복해도 다시 묻지 않는다. */
  const decidedRef = useRef(false);
  /** 마지막으로 확인한 재생 위치 — 저장 flush와 리로드 복귀에 쓴다. */
  const lastTimeRef = useRef(0);
  /** 마지막으로 확인한 길이 — 언마운트 flush 때 <video>에서 못 읽으므로 함께 기억한다. */
  const lastDurationRef = useRef(0);
  /** 마지막으로 저장한 위치 — SAVE_INTERVAL_SEC 간격 판정용. */
  const savedTimeRef = useRef(0);

  /**
   * 현재 위치를 즉시 저장(이탈·일시정지 시점).
   * 언마운트 cleanup에선 React가 ref를 먼저 끊으므로 <video>를 못 읽는다 → 마지막으로 본 값으로 저장.
   */
  const flush = useCallback(() => {
    if (!resumeKey) return;
    const el = videoRef.current;
    const t = el ? el.currentTime : lastTimeRef.current;
    const d = el ? el.duration : lastDurationRef.current;
    savedTimeRef.current = t;
    savePlaybackProgress(resumeKey, t, d);
  }, [resumeKey]);

  // 탭 종료/백그라운드 전환은 언마운트를 보장하지 않는다(모바일 Safari) → pagehide·visibilitychange로도 저장.
  useEffect(() => {
    if (!resumeKey) return;
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
      flush();
    };
  }, [resumeKey, flush]);

  /**
   * 첫 재생 가로채기 — 저장 위치가 있으면 일단 멈추고 묻는다.
   * 이미 앞으로 이동한 뒤(스크럽) 재생이면 사용자의 명시적 선택이므로 묻지 않는다.
   */
  function handlePlay() {
    const el = videoRef.current;
    if (!el || !resumeKey || decidedRef.current || el.currentTime > 1) return;
    decidedRef.current = true;
    const saved = readPlaybackProgress(resumeKey);
    if (!saved) return;
    if (isFullscreenVideo(el)) {
      seek(el, saved.t);
      return;
    }
    el.pause();
    setPromptAt(saved.t);
  }

  function chooseResume() {
    const el = videoRef.current;
    const target = promptAt;
    setPromptAt(null);
    if (!el || target === null) return;
    lastTimeRef.current = target;
    savedTimeRef.current = target;
    seek(el, target);
    tryPlay(el);
  }

  function chooseRestart() {
    const el = videoRef.current;
    setPromptAt(null);
    if (resumeKey) clearPlaybackProgress(resumeKey);
    lastTimeRef.current = 0;
    savedTimeRef.current = 0;
    if (!el) return;
    seek(el, 0);
    tryPlay(el);
  }

  function handleTimeUpdate() {
    const el = videoRef.current;
    if (!el || !resumeKey) return;
    lastTimeRef.current = el.currentTime;
    lastDurationRef.current = el.duration;
    if (Math.abs(el.currentTime - savedTimeRef.current) < SAVE_INTERVAL_SEC) return;
    savedTimeRef.current = el.currentTime;
    savePlaybackProgress(resumeKey, el.currentTime, el.duration);
  }

  function handleEnded() {
    // 끝까지 봤으면 기억할 위치가 없다 → 다음엔 묻지 않고 처음부터.
    if (resumeKey) clearPlaybackProgress(resumeKey);
    lastTimeRef.current = 0;
    savedTimeRef.current = 0;
  }

  /**
   * 서명 URL 재발급 등으로 src가 갈리면 <video>가 0초부터 다시 로드된다 →
   * 다시 묻지 않고 보던 자리로 조용히 복귀(사용자가 직접 앞으로 되감은 경우는 제외).
   */
  function handleLoadedMetadata() {
    const el = videoRef.current;
    if (!el || !resumeKey) return;
    lastDurationRef.current = el.duration;
    if (el.currentTime > 1 || lastTimeRef.current < MIN_RESUME_SEC) return;
    el.currentTime = lastTimeRef.current;
  }

  return (
    <div className={['relative', className ?? ''].join(' ')}>
      <video
        ref={videoRef}
        controls
        // 인페이지 재생 — 없으면 iPhone이 네이티브 전체화면으로 가로채 오버레이를 덮는다.
        playsInline
        preload="metadata"
        poster={poster ?? undefined}
        src={src}
        onPlay={handlePlay}
        onTimeUpdate={handleTimeUpdate}
        onPause={flush}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        className="aspect-video w-full rounded-m bg-black"
      />

      {/* 이어보기 팝업 — 영상 위 오버레이. 컨트롤을 덮어 둘 중 하나를 고르게 한다(선택 후 사라짐). */}
      {promptAt !== null && (
        <div
          role="group"
          aria-label="이어보기 안내"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-m bg-black/70 p-4 text-center"
        >
          <p className="text-body-s-400 text-[var(--text-on-primary)]">
            지난번 <span className="text-body-s-500">{formatDuration(promptAt)}</span>까지 보셨어요.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" onClick={chooseResume}>
              이어보기
            </Button>
            <Button size="sm" variant="secondary" onClick={chooseRestart}>
              처음부터
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
