'use client';

import { DisciplineChip } from '@/entities/discipline';
import { DISCIPLINES, type Discipline } from '@/shared/model/enums';

/**
 * DisciplinePicker — 종목 다중 토글 (F3 / Design §7c "[🥋 기][〰 노기✓]…").
 *
 * DISCIPLINES 순서(기·노기·레슬링·타격·MMA)대로 토글 버튼을 깐다. 각 버튼은
 * 표시 전용 DisciplineChip(role=img)을 감싸고, `aria-pressed`로 선택 상태를 노출한다
 * (칩은 색+아이콘+라벨 3중 인코딩이라 버튼이 선택 의미를 보강 — F9-AC4 색약 대응).
 *
 * 값/onChange만 받는 controlled 컴포넌트 — 폼 상태는 부모(SessionEditorForm)가 소유.
 */

export interface DisciplinePickerProps {
  value: Discipline[];
  onChange: (next: Discipline[]) => void;
}

export function DisciplinePicker({ value, onChange }: DisciplinePickerProps) {
  const toggle = (d: Discipline) => {
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {DISCIPLINES.map((d) => {
        const selected = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(d)}
            className="rounded-xxs outline-none transition-transform duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:shadow-[var(--ring-focus)] active:scale-95"
          >
            <DisciplineChip discipline={d} selected={selected} />
          </button>
        );
      })}
    </div>
  );
}
