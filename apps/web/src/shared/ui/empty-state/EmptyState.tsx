import type { ReactNode } from 'react';
import { cx } from 'class-variance-authority';

/**
 * EmptyState — 빈 상태 안내 (Design §7b/§7e — "이 날의 첫 세션을 기록하세요" 등).
 *
 * 아이콘(선택) + 제목 + 설명(선택) + 액션 슬롯(선택)을 세로 중앙 정렬.
 * 모든 워크어블 페이지 셸이 데이터 없는 동안 이걸로 빈 영역을 채운다.
 * 표시 전용 → 서버 컴포넌트.
 */
export interface EmptyStateProps {
  /** 상단 아이콘/일러스트 슬롯. */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** 버튼 등 액션 슬롯. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center gap-2 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-1 text-[var(--text-disabled)]" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-heading-xs text-[var(--text-strong)]">{title}</p>
      {description && (
        <p className="max-w-sm text-body-s-400 text-[var(--text-muted)]">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
