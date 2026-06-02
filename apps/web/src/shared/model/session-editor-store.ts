'use client';

import { create } from 'zustand';

/**
 * 세션 에디터 오버레이 스토어 (F3 / Design §7c — 바텀시트·모달 열림 상태).
 *
 * WHY shared 레이어인가 — 이 오버레이는 **여러 진입점**에서 열린다:
 *   · app-shell(widget)의 QuickAddFab(전역 + 버튼)
 *   · day-detail(widget)의 "세션 추가" 버튼(선택 날짜 프리셋)
 *   · calendar(app 레이어)의 상단바 "세션" 버튼
 *   · 그리고 정작 시트를 렌더하는 session-editor(widget) 자신
 * FSD는 같은 레이어 간 import(특히 widget→widget)를 금지한다. 따라서 이 열림 상태를
 * 최하위 shared 레이어에 두어, 위 모든 호출부가 **하향(downward) import** 한 줄로
 * 동일한 단일 스토어에 도달하게 한다(widget→widget 의존 없이 상태 공유).
 *
 * NOTE: 이 파일은 'use client' 클라이언트 모듈이므로 `shared/model/index.ts`
 *       (서버 안전 enums 배럴)에서 re-export 하지 않는다. env.ts와 동일하게,
 *       필요한 호출부에서 이 파일을 **직접 import** 한다.
 *
 * UI 상태(서버 데이터 아님) → zustand로 보관(theme-store.ts 패턴 미러, Develop §6b).
 */

export type SessionEditorMode = 'create' | 'edit';

interface OpenParams {
  mode?: SessionEditorMode;
  /** 'YYYY-MM-DD' 프리셋 날짜. 없으면 호스트가 오늘로 채운다. */
  presetDate?: string | null;
  sessionId?: string | null; // edit 모드 대상(인프라 후 prefill)
}

interface SessionEditorState {
  isOpen: boolean;
  mode: SessionEditorMode;
  presetDate: string | null;
  sessionId: string | null;
  open: (params?: OpenParams) => void;
  close: () => void;
}

export const useSessionEditorStore = create<SessionEditorState>((set) => ({
  isOpen: false,
  mode: 'create',
  presetDate: null,
  sessionId: null,
  open: (params) =>
    set({
      isOpen: true,
      mode: params?.mode ?? 'create',
      presetDate: params?.presetDate ?? null,
      sessionId: params?.sessionId ?? null,
    }),
  close: () => set({ isOpen: false }),
}));
