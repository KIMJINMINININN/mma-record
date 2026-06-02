'use client';

import dayjs from 'dayjs';

import { Button, PlusIcon } from '@/shared/ui';
import { useSessionEditorStore } from '@/shared/model/session-editor-store';

/**
 * AddSessionButton — 선택 날짜를 프리셋해 세션 에디터를 여는 버튼 (F3 / Design §7b·§7c).
 *
 * day-detail(widget)의 서버 컴포넌트(DayDetail) 안에서 쓰는 작은 클라이언트 아일랜드.
 * shared 오버레이 스토어를 직접 import 하므로 widget→widget 의존이 생기지 않는다(FSD).
 */

export interface AddSessionButtonProps {
  /** 에디터에 프리셋할 날짜(선택 날짜). */
  date: Date;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  /** 버튼 라벨(기본 "세션 추가"). */
  label?: string;
}

export function AddSessionButton({
  date,
  variant = 'primary',
  size = 'md',
  label,
}: AddSessionButtonProps) {
  const open = useSessionEditorStore((s) => s.open);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => open({ mode: 'create', presetDate: dayjs(date).format('YYYY-MM-DD') })}
    >
      <PlusIcon width={size === 'sm' ? 16 : 18} height={size === 'sm' ? 16 : 18} />
      {label ?? '세션 추가'}
    </Button>
  );
}
