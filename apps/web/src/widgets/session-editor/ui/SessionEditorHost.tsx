'use client';

import { useEffect, useId, useRef } from 'react';
import dayjs from 'dayjs';

import { IconButton } from '@/shared/ui';
import { useSessionEditorStore } from '@/shared/model/session-editor-store';

import { SessionEditorForm } from './SessionEditorForm';

/**
 * SessionEditorHost — 세션 에디터 오버레이 셸 (F3 / Design §7c).
 *
 * 단일 전역 호스트((app)/layout에 1회 마운트)로, 모든 진입점(FAB·day-detail·calendar)이
 * shared 오버레이 스토어(useSessionEditorStore)를 통해 이 시트를 연다.
 *
 * 반응형:
 *  - 모바일(기본): 바텀시트 — 하단 고정, 상단 라운드 + grab 핸들, animate-bs-in 슬라이드업.
 *    body 하단 패딩에 safe-area-inset-bottom을 더해 저장 CTA가 홈 인디케이터를 비킨다.
 *  - md+: 중앙 모달 — 백드롭 place-items-center, 카드형 패널(rounded-l + shadow-e4).
 *
 * 접근성(A11y §10.1): role=dialog · aria-modal · aria-labelledby(제목),
 *  ESC 닫기, 열릴 때 패널로 포커스 이동/닫힐 때 직전 포커스 복원, 열려 있는 동안 body 스크롤 잠금.
 *  Tab/Shift+Tab은 패널 안에 **가둔다(Tab 순환)** — aria-modal 약속대로 포커스가 어두운
 *  배경으로 새지 않는다. 백드롭 클릭만 닫히도록 패널 클릭은 전파를 멈춘다.
 *
 * 폼은 열려 있는 동안에만 마운트(닫히면 언마운트)되므로 매 오픈마다 로컬 상태가 새로 시작된다
 * → 수동 reset 불필요(폼이 그 사실에 의존).
 */
export function SessionEditorHost() {
  const isOpen = useSessionEditorStore((s) => s.isOpen);
  const mode = useSessionEditorStore((s) => s.mode);
  const presetDate = useSessionEditorStore((s) => s.presetDate);
  const sessionId = useSessionEditorStore((s) => s.sessionId);
  const close = useSessionEditorStore((s) => s.close);

  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // 열기 직전 포커스를 기억해 닫을 때 복원(A11y).
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // ESC 닫기 + body 스크롤 잠금 + 포커스 이동/복원 — 열려 있을 때만 활성.
  useEffect(() => {
    if (!isOpen) return;

    lastFocusedRef.current = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      // Tab 포커스 트랩 — 패널 내부 포커스 가능 요소 사이만 순환(배경으로 새지 않음).
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        // 첫 요소(또는 tabIndex=-1 패널)에서 Shift+Tab → 마지막으로 순환.
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 패널로 포커스 이동(다음 틱 — 마운트 후 DOM 준비 보장).
    const id = window.requestAnimationFrame(() => panelRef.current?.focus());

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.cancelAnimationFrame(id);
      // 직전 포커스 복원(여전히 문서에 있을 때만).
      lastFocusedRef.current?.focus?.();
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  // 효과적 초기 날짜: presetDate ?? 오늘(클라이언트 결정).
  const effectiveDate = presetDate ?? dayjs().format('YYYY-MM-DD');
  const d = dayjs(effectiveDate);
  const dateLabel = `${d.month() + 1}월 ${d.date()}일`;
  const title = mode === 'edit' ? '세션 편집' : `세션 추가 — ${dateLabel}`;

  return (
    // 백드롭(scrim) — 클릭 시 닫힘. md+에서는 모달 센터링용 grid.
    <div
      onClick={close}
      className="fixed inset-0 z-50 bg-[var(--surface-overlay)] md:grid md:place-items-center md:p-6"
    >
      {/* 패널 — 모바일=바텀시트, md+=중앙 모달. 클릭 전파 차단(백드롭만 닫힘). */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={[
          'fixed inset-x-0 bottom-0 flex max-h-[90dvh] flex-col outline-none',
          'rounded-t-[var(--radius-xl)] bg-[var(--surface-base)] shadow-[var(--shadow-e4)]',
          'animate-bs-in motion-reduce:animate-none',
          // md+: 바텀시트 고정 해제 → 중앙 카드 모달.
          'md:static md:inset-auto md:max-h-[85vh] md:w-full md:max-w-lg md:rounded-l',
        ].join(' ')}
      >
        {/* grab 핸들 — 모바일 전용 시각 단서. */}
        <div aria-hidden="true" className="flex justify-center pt-2.5 md:hidden">
          <span className="h-1 w-9 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* 헤더 — 제목 + 닫기 */}
        <header className="flex items-center justify-between gap-2 px-4 pb-3 pt-3 md:px-6 md:pt-5">
          <h2 id={titleId} className="text-heading-s text-[var(--text-strong)]">
            {title}
          </h2>
          <IconButton aria-label="닫기" size="sm" onClick={close}>
            <CloseIcon />
          </IconButton>
        </header>

        {/* 본문 — 스크롤 영역. 하단 패딩에 safe-area를 더해 CTA가 홈 인디케이터를 비킴. */}
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-[var(--border-subtle)] px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] md:px-6 md:pb-6">
          <SessionEditorForm
            initialDate={effectiveDate}
            mode={mode}
            sessionId={sessionId}
            onDone={close}
          />
        </div>
      </div>
    </div>
  );
}

/** 닫기(✕) 아이콘 — currentColor 상속(공용 아이콘셋에 X 없음, TagChip CloseIcon 관용구). */
function CloseIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
