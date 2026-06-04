'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { fetchTechniques } from '@/entities/technique';
import { DisciplineChip } from '@/entities/discipline';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { HIT_AREA_44, HIT_AREA_44_Y } from '@/shared/ui';

/**
 * TechniquePicker — 세션에 "다룬 기술" 연결 (F3/F4 / #6-2).
 *
 * 내 라이브러리(fetchTechniques, ['techniques','list'] 키 공유)에서 이름으로 검색·선택한다.
 * 선택분은 { technique_id, day_memo_md } 드래프트로 보관 → 폼이 log_session p_techniques 로 넘긴다
 * (RPC 0013이 session_techniques upsert 지원). 그날 메모(day_memo_md)는 후속 — 현재 null.
 *
 * 데이터 게이팅: AUTH OFF면 fetchTechniques 비활성 → 후보 [](콤보박스 빈 상태). 가짜 기술 금지.
 * 라이브러리가 비어 있으면(기술 0개) "새 기술 만들기" 안내 링크만 — TagInput 콤보박스 a11y 관용구를 따른다.
 */

export interface SessionTechniqueDraft {
  technique_id: string;
  day_memo_md: string | null;
}

export interface TechniquePickerProps {
  value: SessionTechniqueDraft[];
  onChange: (next: SessionTechniqueDraft[]) => void;
  /** 최대 연결 기술 수(도달 시 입력 잠금). */
  max?: number;
}

const DEFAULT_MAX_TECHNIQUES = 30;

/** TagInput INPUT_BASE 관용구의 컴팩트 input 변형. */
const INPUT_BASE = [
  'min-w-40 flex-1 h-8 rounded-xxs px-2.5 text-button-s',
  'bg-[var(--surface-base)] text-[var(--text-default)]',
  'border border-[var(--border-strong)]',
  'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
  'outline-none focus-visible:shadow-[var(--ring-focus)]',
  'placeholder:text-[var(--text-disabled)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

export function TechniquePicker({
  value,
  onChange,
  max = DEFAULT_MAX_TECHNIQUES,
}: TechniquePickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const optionId = (i: number) => `${reactId}-opt-${i}`;

  // 내 기술(최근순). enabled OFF면 [](휴면). 라이브러리 카드와 동일 키 → 캐시 공유.
  const { data: techniques = [] } = useQuery({
    queryKey: ['techniques', 'list'],
    queryFn: fetchTechniques,
    enabled: isAuthEnabled(),
  });

  const byId = useMemo(() => new Map(techniques.map((t) => [t.id, t])), [techniques]);
  const selectedIds = useMemo(() => new Set(value.map((v) => v.technique_id)), [value]);
  const atMax = value.length >= max;

  // 검색 후보(이름 부분일치, 이미 선택된 건 제외). 상위 8개만.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return techniques
      .filter((t) => !selectedIds.has(t.id))
      .filter((t) => (q === '' ? true : t.name.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [techniques, query, selectedIds]);

  const dropdownOpen = open && matches.length > 0;

  function add(id: string) {
    if (atMax || selectedIds.has(id)) return;
    onChange([...value, { technique_id: id, day_memo_md: null }]);
    setQuery('');
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function remove(id: string) {
    onChange(value.filter((v) => v.technique_id !== id));
  }

  /** 그날 메모(day_memo_md) 갱신 — 빈 문자열은 null로(미설정). 입력 중 글자는 그대로 보존. */
  function setMemo(id: string, memo: string) {
    onChange(
      value.map((v) =>
        v.technique_id === id ? { ...v, day_memo_md: memo === '' ? null : memo } : v,
      ),
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      if (matches.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % matches.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      if (matches.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i <= 0 ? matches.length - 1 : i - 1));
      return;
    }
    if (e.key === 'Enter') {
      const active = activeIndex >= 0 ? matches[activeIndex] : matches[0];
      if (active) {
        e.preventDefault();
        add(active.id);
      }
      return;
    }
    if (e.key === 'Escape' && dropdownOpen) {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const activeDescendant =
    dropdownOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined;

  const libraryEmpty = isAuthEnabled() && techniques.length === 0;

  return (
    <div className="flex flex-col gap-2">
      {/* 선택된 기술 행들 — 종목 칩 + 이름 + 제거. */}
      {value.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {value.map((draft) => {
            const t = byId.get(draft.technique_id);
            return (
              <li
                key={draft.technique_id}
                className="flex flex-col gap-1.5 rounded-xs border border-[var(--border-subtle)] bg-[var(--surface-base)] px-2.5 py-2"
              >
                <div className="flex items-center gap-2">
                  {t ? (
                    <>
                      <DisciplineChip discipline={t.discipline} size="xs" />
                      <span className="min-w-0 flex-1 truncate text-body-s-500 text-[var(--text-strong)]">
                        {t.name}
                      </span>
                    </>
                  ) : (
                    // 후보 로드 전/삭제된 기술 — id만 있는 경우의 방어적 표시.
                    <span className="min-w-0 flex-1 truncate text-body-s-400 text-[var(--text-muted)]">
                      기술 불러오는 중…
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(draft.technique_id)}
                    aria-label={`다룬 기술 ${t?.name ?? ''} 제거`}
                    // 시각 18px 유지 + 중앙 투명 pseudo 로 hit-area 44(WCAG 2.5.5). 부모 flex 행은 비-clip.
                    className={`shrink-0 rounded-full p-1 text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--danger)] focus-visible:shadow-[var(--ring-focus)] ${HIT_AREA_44}`}
                  >
                    <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
                      <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
                    </svg>
                  </button>
                </div>
                {/* 그날 메모(day_memo_md) — 선택. 이 세션에서 이 기술에 대한 짧은 메모(SessionCard에 표시). */}
                <input
                  type="text"
                  value={draft.day_memo_md ?? ''}
                  onChange={(e) => setMemo(draft.technique_id, e.target.value)}
                  placeholder="그날 메모 (선택) — 예: 그립 디테일"
                  maxLength={200}
                  aria-label={`${t?.name ?? '기술'} 그날 메모`}
                  className="h-7 w-full rounded-xxs border border-[var(--border-strong)] bg-[var(--surface-base)] px-2 text-button-s text-[var(--text-default)] outline-none placeholder:text-[var(--text-disabled)] focus-visible:shadow-[var(--ring-focus)]"
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* 검색 콤보박스(라이브러리가 비어있지 않을 때). */}
      {!libraryEmpty && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={atMax}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={handleKeyDown}
            placeholder={atMax ? `기술은 최대 ${max}개까지` : '기술 이름으로 검색해 추가'}
            className={INPUT_BASE}
            role="combobox"
            aria-expanded={dropdownOpen}
            aria-controls={dropdownOpen ? listboxId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={activeDescendant}
            aria-label="다룬 기술 검색"
          />

          {dropdownOpen && (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="기술 추천"
              className={[
                'absolute left-0 top-[calc(100%+4px)] z-10 w-full max-w-md',
                'flex flex-col gap-0.5 p-1',
                'rounded-xs border border-[var(--border-default)] bg-[var(--surface-raised)]',
                'shadow-[var(--shadow-e3)] max-h-56 overflow-auto',
              ].join(' ')}
            >
              {matches.map((t, i) => {
                const active = i === activeIndex;
                return (
                  <li
                    key={t.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={active}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      add(t.id);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={[
                      'flex cursor-pointer items-center gap-2 rounded-xxs px-2 py-1.5 text-button-s',
                      active
                        ? 'bg-[var(--primary-soft)] text-[var(--primary-active)]'
                        : 'text-[var(--text-default)]',
                    ].join(' ')}
                  >
                    <DisciplineChip discipline={t.discipline} size="xs" />
                    <span className="min-w-0 truncate">{t.name}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* 라이브러리가 비었을 때 안내 + 새 기술 링크. */}
      {libraryEmpty && (
        <p className="text-body-xs-400 text-[var(--text-muted)]">
          아직 등록한 기술이 없습니다. 먼저 기술을 만들어 두면 여기서 골라 붙일 수 있어요.
        </p>
      )}
      <div>
        <Link
          href="/techniques/new"
          // 시각 h-8(32px) 유지 + 세로 투명 pseudo 로 hit-area 높이 44(WCAG 2.5.5) — Button sm 과 동일 처리.
          className={`inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-xxs px-2.5 text-button-s font-medium select-none border border-[var(--border-strong)] bg-[var(--surface-base)] text-[var(--text-default)] outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] pointer-hover:bg-[var(--surface-sunken)] focus-visible:shadow-[var(--ring-focus)] ${HIT_AREA_44_Y}`}
        >
          + 새 기술 만들기
        </Link>
      </div>
    </div>
  );
}
