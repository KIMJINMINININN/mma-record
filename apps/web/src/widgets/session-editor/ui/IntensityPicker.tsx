'use client';

/**
 * IntensityPicker — 강도 1~5 인터랙티브 점 입력 (F3 / Design §7c "강도 ●●●○○").
 *
 * SessionCard IntensityDots의 점 비주얼(채움=--primary / 빈=--border-strong)을 **미러**한다
 * (크기만 입력용으로 키운 별도 구현). 각 점은 누를 수 있는 `<button>`이다.
 * - N번째 점 클릭 → 강도 N.
 * - 현재 값과 같은 점을 다시 클릭 → null(지움). 토글-투-클리어 방식이라 별도
 *   "지우기" 버튼 없이도 선택 해제 가능(영역 절약 + 90초 마찰 최소화).
 *
 * 값/onChange만 받는 controlled 컴포넌트 — 폼 상태는 부모(SessionEditorForm)가 소유.
 */

export interface IntensityPickerProps {
  value: number | null;
  onChange: (n: number | null) => void;
}

const LEVELS = [1, 2, 3, 4, 5] as const;

export function IntensityPicker({ value, onChange }: IntensityPickerProps) {
  return (
    <div role="group" aria-label="강도" className="flex items-center gap-1.5">
      {LEVELS.map((n) => {
        const filled = value != null && n <= value;
        return (
          <button
            key={n}
            type="button"
            aria-label={`강도 ${n}`}
            aria-pressed={value === n}
            // 같은 값 재클릭 → 지움(토글-투-클리어), 그 외 → 해당 값으로.
            onClick={() => onChange(value === n ? null : n)}
            className="inline-flex size-7 items-center justify-center rounded-full outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] pointer-hover:bg-[var(--surface-sunken)] focus-visible:shadow-[var(--ring-focus)]"
          >
            <span
              aria-hidden="true"
              className={[
                'size-2.5 rounded-full transition-colors duration-[var(--duration-fast)]',
                filled ? 'bg-[var(--primary)]' : 'bg-[var(--border-strong)]',
              ].join(' ')}
            />
          </button>
        );
      })}
      {value != null && (
        <span className="ml-0.5 text-body-xs-400 tabular-nums text-[var(--text-muted)]">
          {value} / 5
        </span>
      )}
    </div>
  );
}
