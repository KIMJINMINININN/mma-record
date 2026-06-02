'use client';

import { useId, useMemo, useRef, useState } from 'react';

import { TagChip } from '@/entities/tag';

import {
  addTag,
  DEFAULT_MAX_TAGS,
  filterSuggestions,
  normalizeTagName,
  removeTagAt,
  tagKey,
} from '../model/tags';

/**
 * TagInput — 자동완성 태그 입력(F7-AC1) + 다중 AND 필터 바(F7-AC3) 겸용.
 * Design §7f(선택 칩 [#스윕 ✕] …) / §10.1 Combobox 키보드(↑↓/Enter/Esc).
 *
 * 두 모드를 props 하나로 흡수한다:
 *  - 입력 모드(세션 에디터): allowCreate=true — 신규 태그 생성 허용(자유 태그).
 *  - 필터 모드(태그 보기): allowCreate=false — 기존 태그(suggestions)에서만 고르기.
 *
 * 선택 태그는 `<TagChip removable>`(entity)로 렌더, 그 뒤 토큰 스타일 native input.
 * 포커스 + 쿼리 있을 때 아래 listbox 드롭다운에 filterSuggestions 결과 + (allowCreate면)
 * "새 태그" 옵션을 띄운다. 중복은 addTag(대소문자 무시)로 합치고 max 도달 시 입력을 잠근다.
 *
 * 도먼시: suggestions=[](인프라 전)면 자동완성 목록이 비므로 생성 경로(allowCreate)만 태그를 더한다.
 * 가짜 추천을 만들지 않는다 — 추천은 실제 사용자 태그가 생긴 뒤에만 채워진다.
 *
 * a11y(§10.1): input은 role="combobox" + aria-expanded/controls/activedescendant,
 * 드롭다운은 role="listbox", 항목은 role="option" + aria-selected. 라벨은 label/aria-label.
 */
export interface TagInputProps {
  /** 현재 선택된 태그 이름 배열(제어). */
  value: string[];
  /** 변경 콜백(추가/제거 모두). */
  onChange: (next: string[]) => void;
  /** 자동완성 후보(인프라 전 dormant=[]). */
  suggestions?: string[];
  /** 목록에 없는 새 태그 생성 허용(입력 모드 true / 필터 모드 false). */
  allowCreate?: boolean;
  /** 최대 태그 수(도달 시 입력 잠금). */
  max?: number;
  placeholder?: string;
  /** 가시 라벨(없으면 aria-label만). */
  label?: string;
}

/** FIELD_BASE(F3)/SELECT_BASE(F4) 관용구의 컴팩트 input 변형 — 칩 줄 아래 토큰 입력. */
const INPUT_BASE = [
  'min-w-32 flex-1 h-8 rounded-xxs px-2.5 text-button-s',
  'bg-[var(--surface-base)] text-[var(--text-default)]',
  'border border-[var(--border-strong)]',
  'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
  'outline-none focus-visible:shadow-[var(--ring-focus)]',
  'placeholder:text-[var(--text-disabled)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

export function TagInput({
  value,
  onChange,
  suggestions = [],
  allowCreate = true,
  max = DEFAULT_MAX_TAGS,
  placeholder,
  label,
}: TagInputProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const labelId = `${reactId}-label`;
  const optionId = (i: number) => `${reactId}-opt-${i}`;

  const atMax = value.length >= max;

  // 추천 목록 + (조건부) "새 태그 생성" 가짜-옵션을 하나의 옵션 배열로 합친다.
  // 정확히 일치(대소문자 무시)하는 추천이 이미 있으면 생성 옵션은 숨긴다(중복 방지).
  const matches = useMemo(
    () => filterSuggestions(suggestions, query, value),
    [suggestions, query, value],
  );
  const trimmed = normalizeTagName(query);
  const hasExact =
    matches.some((m) => tagKey(m) === tagKey(trimmed)) ||
    value.some((v) => tagKey(v) === tagKey(trimmed));
  const showCreate = allowCreate && trimmed !== '' && !hasExact;

  type Option =
    | { kind: 'suggestion'; label: string }
    | { kind: 'create'; label: string };
  const options: Option[] = useMemo(() => {
    const base: Option[] = matches.map((m) => ({ kind: 'suggestion', label: m }));
    if (showCreate) base.push({ kind: 'create', label: trimmed });
    return base;
  }, [matches, showCreate, trimmed]);

  // 드롭다운은 포커스 + (쿼리 있거나 고를 추천이 있을 때) 노출. 도먼시(추천 0 + 빈 쿼리)면 안 뜬다.
  const dropdownOpen = open && options.length > 0;

  function commit(name: string) {
    const next = addTag(value, name);
    onChange(next);
    setQuery('');
    setActiveIndex(-1);
    // 입력 유지 + 포커스 유지(연속 추가 UX) — max 도달 시 input이 disabled 되어도 흐름은 그대로.
    inputRef.current?.focus();
  }

  function selectOption(opt: Option) {
    commit(opt.label); // suggestion/create 둘 다 라벨을 그대로 추가(addTag가 정규화/중복 처리)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // 쉼표 = 구분자(생성 모드 자유 태그). Enter와 동일하게 현재 입력을 커밋.
    if (e.key === ',') {
      e.preventDefault();
      if (allowCreate && trimmed !== '') commit(trimmed);
      return;
    }
    if (e.key === 'Backspace' && query === '' && value.length > 0) {
      // 빈 입력에서 Backspace → 마지막 칩 제거(흔한 토큰 입력 관용구).
      e.preventDefault();
      onChange(removeTagAt(value, value.length - 1));
      return;
    }
    if (e.key === 'ArrowDown') {
      if (options.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % options.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      if (options.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
      return;
    }
    if (e.key === 'Enter') {
      // 활성 옵션이 있으면 그걸, 없고 생성 가능하면 현재 입력을 새 태그로.
      const active = activeIndex >= 0 ? options[activeIndex] : undefined;
      if (active) {
        e.preventDefault();
        selectOption(active);
      } else if (allowCreate && trimmed !== '') {
        e.preventDefault();
        commit(trimmed);
      }
      return;
    }
    if (e.key === 'Escape') {
      if (dropdownOpen) {
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
    }
  }

  const activeDescendant =
    dropdownOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span id={labelId} className="text-body-s-500 text-[var(--text-default)]">
          {label}
        </span>
      )}

      {/* 선택 태그 칩(제거 가능) + input 을 한 줄(wrap)로 묶는다. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((name, i) => (
          <TagChip
            key={`${tagKey(name)}-${i}`}
            label={name}
            removable
            onRemove={() => onChange(removeTagAt(value, i))}
          />
        ))}

        {/* combobox: input + 포지셔닝용 wrapper(드롭다운 anchor). */}
        <div className="relative min-w-32 flex-1">
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
            onBlur={() => {
              // blur 시 옵션 mousedown(아래)이 먼저 처리되도록 약간 늦춰 닫는다.
              window.setTimeout(() => setOpen(false), 120);
            }}
            onKeyDown={handleKeyDown}
            placeholder={atMax ? `태그는 최대 ${max}개까지` : placeholder}
            className={INPUT_BASE}
            role="combobox"
            aria-expanded={dropdownOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeDescendant}
            aria-label={label ? undefined : (placeholder ?? '태그')}
            aria-labelledby={label ? labelId : undefined}
          />

          <ul
            id={listboxId}
            role="listbox"
            aria-label={label ?? '태그 추천'}
            hidden={!dropdownOpen}
            className={[
              'absolute left-0 top-[calc(100%+4px)] z-10 w-max min-w-full max-w-64',
              'flex flex-col gap-0.5 p-1',
              'rounded-xs border border-[var(--border-default)] bg-[var(--surface-raised)]',
              'shadow-[var(--shadow-e3)]',
              'max-h-56 overflow-auto',
            ].join(' ')}
          >
              {options.map((opt, i) => {
                const active = i === activeIndex;
                return (
                  <li
                    key={opt.kind === 'create' ? `__create-${opt.label}` : opt.label}
                    id={optionId(i)}
                    role="option"
                    aria-selected={active}
                    // onMouseDown(클릭 전 발생) → input blur 보다 먼저 커밋되도록.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectOption(opt);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={[
                      'flex cursor-pointer items-center gap-1 rounded-xxs px-2 py-1.5',
                      'text-button-s',
                      active
                        ? 'bg-[var(--primary-soft)] text-[var(--primary-active)]'
                        : 'text-[var(--text-default)]',
                    ].join(' ')}
                  >
                    {opt.kind === 'create' ? (
                      <span className="truncate">
                        <span className="text-[var(--text-muted)]">+ 새 태그 </span>
                        &ldquo;{opt.label}&rdquo;
                      </span>
                    ) : (
                      <span className="truncate">
                        <span aria-hidden="true" className="text-[var(--text-muted)]">
                          #
                        </span>
                        {opt.label}
                      </span>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      </div>

      {atMax && (
        <p className="text-body-xs-400 text-[var(--text-muted)]">
          태그는 최대 {max}개까지 추가할 수 있어요.
        </p>
      )}
    </div>
  );
}
