'use client';

import { useSessionEditorStore } from '@/shared/model/session-editor-store';
import { HIT_AREA_44 } from '@/shared/ui';

/**
 * SessionEditButton — 세션 카드의 '수정' 진입점 클라 아일랜드 (F3 편집).
 *
 * SessionCard는 서버 컴포넌트라 store(클라)를 못 부른다 → SessionFavoriteStar와 동일하게
 * 작은 클라 아일랜드로 분리한다. 클릭 시 세션 에디터를 edit 모드로 열고(presetDate=훈련일),
 * 폼이 sessionId로 기존 세션을 페치해 prefill 한다(SessionEditorForm).
 */
export function SessionEditButton({ sessionId, trainedOn }: { sessionId: string; trainedOn: string }) {
  const open = useSessionEditorStore((s) => s.open);
  return (
    <button
      type="button"
      onClick={() => open({ mode: 'edit', sessionId, presetDate: trainedOn })}
      aria-label="세션 수정"
      className={`inline-flex size-7 items-center justify-center rounded-full text-[var(--text-muted)] outline-none transition-colors duration-[var(--duration-fast)] pointer-hover:text-[var(--text-default)] focus-visible:shadow-[var(--ring-focus)] ${HIT_AREA_44}`}
    >
      <svg
        width={15}
        height={15}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </button>
  );
}
