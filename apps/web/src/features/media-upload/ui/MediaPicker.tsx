'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import type { MediaSource } from '@the-others/webview-protocol';

import { MediaThumb, parseYoutubeVideoId, safeExternalUrl } from '@/entities/media';
import { Button, HIT_AREA_44_BEFORE } from '@/shared/ui';

import {
  ALLOWED_UPLOAD_MIME,
  validateDuration,
  validateUploadFileSync,
  type MediaDraft,
} from '../model/media-draft';
import {
  isNativeBridgeAvailable,
  requestNativeCapture,
  type NativeCaptureRejection,
} from '../model/native-bridge';

/**
 * MediaPicker — 세션/기술에 붙일 미디어 초안 수집기 (F5 / Design §7c 미디어 행 · §9.2).
 *
 * 두 경로:
 *  1) 유튜브 링크 — 붙여넣기 → parseYoutubeVideoId → {kind:'youtube', videoId} (videoId 중복 제거).
 *     백엔드 불필요: 인프라 전에도 완전 동작(임베드/썸네일은 entities/media가 실제 렌더).
 *  2) 파일(촬영/업로드) — accept=mp4,mov. 선택 시 동기 MIME/용량 검증 → <video> 메타로 길이 확인
 *     → 통과 시 {kind:'upload', file, previewUrl(object-URL), ...}. 한도 초과면 §9.2 안내 +
 *     "유튜브로 추가" 유도(유튜브 입력에 포커스).
 *
 * 도먼시(인프라 last): 여기서는 sign-upload를 호출하지 않는다 — 초안 수집 + object-URL 프리뷰까지가
 * F5 셸 범위다. 실제 저장(sign-upload→PUT→media_assets→media_id)은 인프라 후.
 *
 * object-URL 누수 방지: upload 초안의 previewUrl을 remove/unmount 시 revoke한다.
 * (현재 화면에 살아있는 URL만 revoke하지 않도록, 직전 set과 비교해 사라진 것만 정리.)
 *
 * SSoT: docs/mma/Develop.md §5.3 / Design §9.2
 */
export interface MediaPickerProps {
  value: MediaDraft[];
  onChange: (next: MediaDraft[]) => void;
  /** 최대 첨부 수. 기본 8. */
  max?: number;
}

const DEFAULT_MAX = 8;
const ACCEPT = ALLOWED_UPLOAD_MIME.join(',');

// 네이티브 브릿지 가용성은 세션 내 불변(window.ReactNativeWebView 유무) → 구독은 no-op.
// useSyncExternalStore로 SSR(서버 스냅샷=false)→클라(실측) 전환을 hydration-safe하게 처리.
const subscribeNative = () => () => {};
const getServerNativeSnapshot = () => false;

/**
 * 선택 파일의 재생 길이(정수 초)를 <video> 메타데이터에서 비동기로 읽는다.
 * HTMLMediaElement.duration은 소수초라 **반드시 정수로 반올림**한다 — sign-upload 라우트와
 * media_assets.duration_sec 스키마가 z.number().int()라 소수면 저장이 거부된다(positive라 최소 1로 클램프).
 * 메타 부재/0/비유한 → null(길이 미상). 실패 시 null.
 */
function readVideoDuration(objectUrl: string): Promise<number | null> {
  return new Promise((resolve) => {
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    const cleanup = () => {
      probe.removeAttribute('src');
      probe.load();
    };
    probe.onloadedmetadata = () => {
      const d = probe.duration;
      cleanup();
      resolve(Number.isFinite(d) && d > 0 ? Math.max(1, Math.round(d)) : null);
    };
    probe.onerror = () => {
      cleanup();
      resolve(null);
    };
    probe.src = objectUrl;
  });
}

export function MediaPicker({ value, onChange, max = DEFAULT_MAX }: MediaPickerProps) {
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [overLimit, setOverLimit] = useState<string | null>(null);
  // 네이티브 앱 WebView 안이면 촬영/갤러리 버튼 노출(브라우저 파일 입력 대신).
  const nativeAvailable = useSyncExternalStore(
    subscribeNative,
    isNativeBridgeAvailable,
    getServerNativeSnapshot,
  );

  const linkInputId = useId();
  const linkErrId = useId();
  const linkInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 비동기 추가(파일 길이 probe / 네이티브 캡처) 후 onChange가 구식 value 클로저를 덮어쓰지 않도록,
  // 최신 커밋된 value를 ref로 추적해 append 기준으로 쓴다(대기 중 다른 미디어 추가분 유실 방지).
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // ── object-URL 누수 방지: 직전 렌더의 upload previewUrl 집합과 비교해 사라진 것만 revoke ──
  const prevUrlsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const current = new Set(
      value.filter((d): d is Extract<MediaDraft, { kind: 'upload' }> => d.kind === 'upload').map((d) => d.previewUrl),
    );
    for (const url of prevUrlsRef.current) {
      if (!current.has(url)) URL.revokeObjectURL(url);
    }
    prevUrlsRef.current = current;
  }, [value]);

  // ── 언마운트 시 남은 object-URL 전부 revoke (cleanup) ──
  // ref는 cleanup 안에서 읽는다 — mount 시점의 초기(빈) Set이 아니라 최신 Set을 보도록.
  useEffect(() => {
    return () => {
      for (const url of prevUrlsRef.current) URL.revokeObjectURL(url);
    };
  }, []);

  const atMax = value.length >= max;

  function focusLinkInput() {
    linkInputRef.current?.focus();
  }

  // ── 링크 추가 — 유튜브면 youtube 초안, 아니면 http(s) 외부 링크 초안으로 자동 라우팅. ──
  function handleAddLink() {
    setLinkError(null);
    const raw = linkInput.trim();
    if (raw === '') return;
    if (atMax) {
      toast.error(`미디어는 최대 ${max}개까지 추가할 수 있습니다.`);
      return;
    }

    const videoId = parseYoutubeVideoId(raw);
    if (videoId) {
      if (value.some((d) => d.kind === 'youtube' && d.videoId === videoId)) {
        setLinkError('이미 추가된 유튜브 영상입니다.');
        return;
      }
      onChange([...value, { kind: 'youtube', videoId }]);
      setLinkInput('');
      return;
    }

    const safe = safeExternalUrl(raw);
    if (!safe) {
      setLinkError('유튜브 링크 또는 http(s) URL을 입력하세요.');
      return;
    }
    if (value.some((d) => d.kind === 'external' && d.url === safe)) {
      setLinkError('이미 추가된 링크입니다.');
      return;
    }
    onChange([...value, { kind: 'external', url: safe, title: null }]);
    setLinkInput('');
  }

  // ── 파일 선택 → 검증 → upload 초안 ──
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setOverLimit(null);
    const file = e.target.files?.[0];
    // 같은 파일 재선택 허용을 위해 input 값 리셋
    e.target.value = '';
    if (!file) return;

    if (atMax) {
      toast.error(`미디어는 최대 ${max}개까지 추가할 수 있습니다.`);
      return;
    }

    const syncErr = validateUploadFileSync(file);
    if (syncErr) {
      if (syncErr.reason === 'size') {
        setOverLimit(syncErr.message);
        focusLinkInput();
      } else {
        toast.error(syncErr.message);
      }
      return;
    }

    // 길이 확인 — object-URL로 메타 로드. (이 URL은 프리뷰로 재사용 → 통과 시 보관)
    const previewUrl = URL.createObjectURL(file);
    const durationSec = await readVideoDuration(previewUrl);
    if (durationSec != null) {
      const durErr = validateDuration(durationSec);
      if (durErr) {
        URL.revokeObjectURL(previewUrl); // 거부된 프리뷰 즉시 정리
        setOverLimit(durErr.message);
        focusLinkInput();
        return;
      }
    }

    onChange([
      ...valueRef.current,
      {
        kind: 'upload',
        file,
        previewUrl,
        sizeBytes: file.size,
        durationSec,
        mime: file.type,
      },
    ]);
    // TODO(infra): 저장 시 sign-upload→PUT→media_assets→media_id.
  }

  // ── 네이티브 촬영/갤러리 → 서명URL 직접 업로드 → native-upload 초안(E 트랙) ──
  async function handleNativeCapture(source: MediaSource) {
    if (atMax) {
      toast.error(`미디어는 최대 ${max}개까지 추가할 수 있습니다.`);
      return;
    }
    try {
      const draft = await requestNativeCapture(source);
      onChange([...valueRef.current, draft]);
    } catch (reason) {
      const r = reason as NativeCaptureRejection;
      // 사용자가 picker를 닫은 것(canceled)은 조용히 무시, 실패만 안내.
      if (!r?.canceled) toast.error(r?.message ?? '미디어 첨부에 실패했습니다.');
    }
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── 추가 컨트롤 행: 파일 / 유튜브 링크 ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        {/* 미디어 추가 진입점 — 네이티브 앱이면 촬영/갤러리(네이티브 직접 업로드), 브라우저면 파일 입력 */}
        <div className="flex shrink-0 gap-2">
          {nativeAvailable ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={atMax}
                onClick={() => handleNativeCapture('camera')}
                title={atMax ? `최대 ${max}개` : '촬영(카메라)'}
              >
                📷 촬영
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={atMax}
                onClick={() => handleNativeCapture('library')}
                title={atMax ? `최대 ${max}개` : '갤러리에서 선택'}
              >
                🖼 갤러리
              </Button>
            </>
          ) : (
            <>
              <input
                ref={fileInputRef}
                id="media-file-input"
                type="file"
                accept={ACCEPT}
                onChange={handleFileSelect}
                disabled={atMax}
                className="sr-only"
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={atMax}
                onClick={() => fileInputRef.current?.click()}
                title={atMax ? `최대 ${max}개` : '촬영/업로드'}
              >
                📹 파일
              </Button>
            </>
          )}
        </div>

        {/* 유튜브 링크 입력 + 추가 */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex gap-2">
            <input
              ref={linkInputRef}
              id={linkInputId}
              type="url"
              inputMode="url"
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value);
                if (linkError) setLinkError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddLink();
                }
              }}
              placeholder="▶ 유튜브 또는 링크 붙여넣기"
              aria-label="유튜브 또는 외부 링크"
              aria-invalid={linkError != null}
              aria-describedby={linkError ? linkErrId : undefined}
              disabled={atMax}
              className={[
                'h-8 min-w-0 flex-1 rounded-xxs px-2.5',
                'bg-[var(--surface-base)] text-body-s-400 text-[var(--text-strong)]',
                'border border-[var(--border-strong)] placeholder:text-[var(--text-disabled)]',
                'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
                'outline-none focus-visible:shadow-[var(--ring-focus)]',
                'disabled:cursor-not-allowed disabled:opacity-50',
              ].join(' ')}
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={atMax || linkInput.trim() === ''}
              onClick={handleAddLink}
            >
              추가
            </Button>
          </div>
          {linkError && (
            <p id={linkErrId} role="alert" className="text-body-xs-400 text-[var(--danger)]">
              <span aria-hidden="true">⚠ </span>
              {linkError}
            </p>
          )}
        </div>
      </div>

      {/* ── 한도 초과 안내(§9.2) — 유튜브 경로 유도 ── */}
      {overLimit && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xs border-l-2 border-[var(--primary)] bg-[var(--primary-soft)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-body-xs-400 text-[var(--text-default)]">
            <span aria-hidden="true">ⓘ </span>
            {overLimit}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setOverLimit(null);
              focusLinkInput();
            }}
          >
            유튜브로 추가
          </Button>
        </div>
      )}

      {/* ── 초안 썸네일 그리드 ── */}
      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {value.map((draft, index) => (
            <li
              key={
                draft.kind === 'youtube'
                  ? `yt-${draft.videoId}`
                  : draft.kind === 'external'
                    ? `ex-${draft.url}`
                    : draft.kind === 'native-upload'
                      ? `nu-${draft.storagePath}`
                      : `up-${draft.previewUrl}`
              }
              className="flex flex-col gap-1"
            >
              <div className="relative">
                {draft.kind === 'youtube' ? (
                  <MediaThumb kind="youtube" youtubeVideoId={draft.videoId} />
                ) : draft.kind === 'external' ? (
                  <MediaThumb kind="external" />
                ) : draft.kind === 'native-upload' ? (
                  // 네이티브 업로드 — 로컬 프리뷰 없음(바이트가 브릿지를 안 거침). 사진/영상 placeholder.
                  <MediaThumb
                    kind="upload"
                    durationSec={draft.isImage ? null : draft.durationSec}
                    uploadLabel={draft.isImage ? '내 사진' : '내 영상'}
                  />
                ) : (
                  <MediaThumb
                    kind="upload"
                    thumbnailUrl={draft.previewUrl}
                    durationSec={draft.durationSec}
                  />
                )}
                <button
                  type="button"
                  aria-label="미디어 제거"
                  onClick={() => handleRemove(index)}
                  // 시각 24px 원 유지 + 중앙 투명 pseudo 로 hit-area 44(WCAG 2.5.5). 이미 absolute 라
                  // _BEFORE(=relative 제외)만 사용(position 유틸 충돌 회피) — before 가 이 버튼 기준으로 확장.
                  className={`absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white outline-none transition-colors pointer-hover:bg-black/90 focus-visible:shadow-[var(--ring-focus)] ${HIT_AREA_44_BEFORE}`}
                >
                  <RemoveIcon />
                </button>
              </div>
              {draft.kind === 'upload' && (
                <span className="text-body-xs-400 text-[var(--text-muted)]">업로드는 인프라 후 저장</span>
              )}
              {draft.kind === 'native-upload' && (
                <span className="text-body-xs-400 text-[var(--text-muted)]">
                  <span aria-hidden="true">✓ </span>
                  업로드 완료
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 제거(✕) 아이콘 — currentColor 상속(공용 아이콘셋에 X 없음, SessionEditorHost 관용구). */
function RemoveIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
