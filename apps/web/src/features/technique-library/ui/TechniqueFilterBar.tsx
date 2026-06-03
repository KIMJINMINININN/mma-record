'use client';

import { DISCIPLINE_META } from '@/entities/discipline';
import { BELT_META } from '@/entities/rank';
import { CATEGORY_LABEL, LEVEL_META, POSITION_LABEL } from '@/entities/technique';
import {
  BELTS,
  DISCIPLINES,
  LEVELS,
  POSITION_KINDS,
  TECHNIQUE_CATEGORIES,
  type Belt,
  type Discipline,
  type Level,
  type PositionKind,
  type TechniqueCategory,
} from '@/shared/model/enums';
import { Button, StarFilledIcon, StarIcon } from '@/shared/ui';

import {
  clearFilters,
  isAnyFilterActive,
  type TechniqueFilters,
  type TechniqueSort,
} from '../model/filters';

/**
 * TechniqueFilterBar — 라이브러리 필터/정렬 바 (F4-AC4 / Design §7d).
 *
 * 종목/분류/포지션/벨트 4개 + 정렬 1개 = 토큰 스타일 native <select>.
 * select 스타일은 F3 SessionEditorForm 의 FIELD_BASE 관용구를 그대로 따르되,
 * 필터 바에 맞게 컴팩트하게(h-8 / text-button-s) 조정한다.
 * 각 필터의 빈 옵션("전체", value="")은 해당 필터 해제를 뜻하고('' → null 캐스팅),
 * 하나라도 활성이면 "필터 초기화" 고스트 버튼을 노출한다.
 */
export interface TechniqueFilterBarProps {
  filters: TechniqueFilters;
  onChange: (next: TechniqueFilters) => void;
}

/** FIELD_BASE(F3) 의 컴팩트 변형 — 필터 바 전용 native select 클래스. */
const SELECT_BASE = [
  'h-8 rounded-xxs pl-2.5 pr-7 text-button-s',
  'bg-[var(--surface-base)] text-[var(--text-default)]',
  'border border-[var(--border-strong)]',
  'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
  'outline-none focus-visible:shadow-[var(--ring-focus)]',
  'pointer-hover:border-[var(--border-default)]',
].join(' ');

export function TechniqueFilterBar({ filters, onChange }: TechniqueFilterBarProps) {
  const anyActive = isAnyFilterActive(filters);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 종목 */}
      <select
        aria-label="종목 필터"
        value={filters.discipline ?? ''}
        onChange={(e) =>
          onChange({ ...filters, discipline: (e.target.value || null) as Discipline | null })
        }
        className={SELECT_BASE}
      >
        <option value="">종목 전체</option>
        {DISCIPLINES.map((d) => (
          <option key={d} value={d}>
            {DISCIPLINE_META[d].label}
          </option>
        ))}
      </select>

      {/* 분류 */}
      <select
        aria-label="분류 필터"
        value={filters.category ?? ''}
        onChange={(e) =>
          onChange({ ...filters, category: (e.target.value || null) as TechniqueCategory | null })
        }
        className={SELECT_BASE}
      >
        <option value="">분류 전체</option>
        {TECHNIQUE_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABEL[c]}
          </option>
        ))}
      </select>

      {/* 포지션 */}
      <select
        aria-label="포지션 필터"
        value={filters.position ?? ''}
        onChange={(e) =>
          onChange({ ...filters, position: (e.target.value || null) as PositionKind | null })
        }
        className={SELECT_BASE}
      >
        <option value="">포지션 전체</option>
        {POSITION_KINDS.map((p) => (
          <option key={p} value={p}>
            {POSITION_LABEL[p]}
          </option>
        ))}
      </select>

      {/* 벨트 */}
      <select
        aria-label="벨트 필터"
        value={filters.belt ?? ''}
        onChange={(e) =>
          onChange({ ...filters, belt: (e.target.value || null) as Belt | null })
        }
        className={SELECT_BASE}
      >
        <option value="">벨트 전체</option>
        {BELTS.map((b) => (
          <option key={b} value={b}>
            {BELT_META[b].label}
          </option>
        ))}
      </select>

      {/* 레벨 (비벨트 종목 적합도 — 벨트와 상호배타 축) */}
      <select
        aria-label="레벨 필터"
        value={filters.level ?? ''}
        onChange={(e) =>
          onChange({ ...filters, level: (e.target.value || null) as Level | null })
        }
        className={SELECT_BASE}
      >
        <option value="">레벨 전체</option>
        {LEVELS.map((lv) => (
          <option key={lv} value={lv}>
            {LEVEL_META[lv].label}
          </option>
        ))}
      </select>

      {/* 즐겨찾기만 — 토글(★). aria-pressed 로 on/off. clearFilters/isAnyFilterActive 에 포함. */}
      <button
        type="button"
        aria-label="즐겨찾기만 보기"
        aria-pressed={filters.favoriteOnly}
        onClick={() => onChange({ ...filters, favoriteOnly: !filters.favoriteOnly })}
        className={[
          'inline-flex h-8 items-center gap-1 rounded-xxs border px-2.5 text-button-s',
          'outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
          'focus-visible:shadow-[var(--ring-focus)]',
          filters.favoriteOnly
            ? 'border-[var(--primary)] bg-[var(--surface-sunken)] text-[var(--primary)]'
            : 'border-[var(--border-strong)] text-[var(--text-default)] pointer-hover:border-[var(--border-default)]',
        ].join(' ')}
      >
        {filters.favoriteOnly ? (
          <StarFilledIcon width={14} height={14} />
        ) : (
          <StarIcon width={14} height={14} />
        )}
        즐겨찾기
      </button>

      {/* 정렬 (분리 — 필터 토글에 영향 없음) */}
      <select
        aria-label="정렬"
        value={filters.sort}
        onChange={(e) => onChange({ ...filters, sort: e.target.value as TechniqueSort })}
        className={`${SELECT_BASE} ml-auto`}
      >
        <option value="recent">최근순</option>
        <option value="name">이름순</option>
        <option value="favorites">즐겨찾기순</option>
      </select>

      {anyActive && (
        <Button variant="ghost" size="sm" onClick={() => onChange(clearFilters(filters))}>
          필터 초기화
        </Button>
      )}
    </div>
  );
}
