'use client';

import { useId, useMemo, useRef, useState, useTransition, type RefObject } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  fetchTags,
  fetchTagUsageCounts,
  TagChip,
  TAG_COLOR_KEYS,
  TAG_COLOR_META,
  tagColorCss,
  type TagColorKey,
} from '@/entities/tag';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { Button, EmptyState, Skeleton } from '@/shared/ui';

import { mergeTagCounts, sortTags, type TagManagerSort, type TagWithCount } from '../model/tags';
import { updateTag, deleteTag, type TagActionResult } from '../api/tag-actions';

/**
 * TagManager — 태그 관리 클라이언트 섬 (F7-AC4: 색·이름 변경, 사용 빈도순 정렬, 삭제).
 *
 * 데이터: fetchTags(전체 행) + fetchTagUsageCounts(taggables client 집계, .range() 전수) — enabled: isAuthEnabled().
 * 쓰기: updateTag/deleteTag 서버 액션(RLS·도먼시) → 성공 시 ['tags'] invalidate(자동완성/필터/관리 동시 갱신).
 * 인라인 rename(중복 사전 체크 + 23505 거부) · 색 스와치 그룹(aria-pressed 토글, DisciplinePicker 패턴) · 인라인 삭제 confirm.
 * 색은 단독 인코딩 아님(F9): TagChip이 '#name' + 색상 라벨(aria) 병기. a11y: dup/삭제 알림 role=alert, 작업 후 포커스 복원.
 */

const SORT_OPTIONS: { value: TagManagerSort; label: string }[] = [
  { value: 'frequency', label: '자주 쓴 순' },
  { value: 'name', label: '이름순' },
];

/** 대소문자 무시 이름 키(클라 중복 사전 체크 — 서버 unique는 정확일치라 보수적으로 막음). */
const nameKey = (s: string) => s.trim().toLowerCase();
/** 색 채움 위 글리프 색 — 다크모드 밝은 fill엔 어두운 글자(DisciplineChip onFill 패턴, 대비 확보). */
const ON_FILL = 'light-dark(var(--text-on-primary), var(--color-gray-900))';

const SELECT_BASE = [
  'h-8 rounded-xxs pl-2.5 pr-7 text-button-s',
  'bg-[var(--surface-base)] text-[var(--text-default)]',
  'border border-[var(--border-strong)]',
  'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
  'outline-none focus-visible:shadow-[var(--ring-focus)]',
].join(' ');

const RENAME_INPUT = [
  'h-8 min-w-0 flex-1 rounded-xxs px-2 text-body-s-400',
  'bg-[var(--surface-base)] text-[var(--text-default)]',
  'border border-[var(--border-strong)]',
  'outline-none focus-visible:border-[var(--primary)] focus-visible:shadow-[var(--ring-focus)]',
].join(' ');

const ACTION_BTN =
  'inline-flex min-h-6 items-center rounded-xxs px-2 py-1 text-button-xs text-[var(--text-muted)] pointer-hover:text-[var(--text-default)] focus-visible:outline-none focus-visible:shadow-[var(--ring-focus)]';

export function TagManager() {
  const authed = isAuthEnabled();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<TagManagerSort>('frequency');

  const { data: tags = [], isPending } = useQuery({
    queryKey: ['tags', 'manage'],
    queryFn: fetchTags,
    enabled: authed,
  });
  const { data: counts } = useQuery({
    queryKey: ['tags', 'usage'],
    queryFn: fetchTagUsageCounts,
    enabled: authed,
  });

  const rows = useMemo(
    () => sortTags(mergeTagCounts(tags, counts ?? new Map()), sort),
    [tags, counts, sort],
  );
  const allNames = useMemo(() => tags.map((t) => t.name), [tags]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['tags'] });

  if (!authed) {
    return (
      <EmptyState
        title="로그인 후 태그를 관리할 수 있어요"
        description="세션·기술에 단 태그의 색·이름을 여기서 관리합니다."
      />
    );
  }
  if (isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-11 rounded-m" />
        ))}
      </div>
    );
  }
  if (tags.length === 0) {
    return (
      <EmptyState
        title="아직 태그가 없습니다"
        description="세션·기술에 태그를 달면 여기서 관리할 수 있어요."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-body-xs-400 tabular-nums text-[var(--text-muted)]">{tags.length}개 태그</p>
        <select
          aria-label="태그 정렬"
          value={sort}
          onChange={(e) => setSort(e.target.value as TagManagerSort)}
          className={SELECT_BASE}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <ul className="overflow-hidden rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        {rows.map((tag) => (
          <TagRow key={tag.id} tag={tag} allNames={allNames} onChanged={refresh} />
        ))}
      </ul>
    </div>
  );
}

/** action 결과 → 토스트 (도먼시는 가짜 성공 금지: info로 안내 — ProfileRankEditor.notify 관용구). */
function notify(res: TagActionResult, successMsg: string): void {
  if (res.ok) toast.success(successMsg);
  else if (res.dormant) toast.info(res.error);
  else toast.error(res.error);
}

type RowMode = 'view' | 'rename' | 'color' | 'delete';

function TagRow({
  tag,
  allNames,
  onChanged,
}: {
  tag: TagWithCount;
  allNames: string[];
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<RowMode>('view');
  const [name, setName] = useState(tag.name);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const nameBtnRef = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const errId = useId();

  const trimmed = name.trim();
  const isDup =
    trimmed !== '' &&
    nameKey(trimmed) !== nameKey(tag.name) &&
    allNames.some((n) => nameKey(n) === nameKey(trimmed));
  const isUnchanged = trimmed === tag.name;
  const canSaveName = trimmed !== '' && !isDup && !isUnchanged && !pending;

  /** 작업 실행 + 결과 토스트. 성공 시 onOk(모드 복귀/포커스 복원) 후 캐시 무효화. */
  function run(fn: () => Promise<TagActionResult>, successMsg: string, onOk?: () => void) {
    start(async () => {
      const res = await fn();
      notify(res, successMsg);
      if (res.ok) {
        onOk?.();
        onChanged();
      }
    });
  }
  /** 모드 종료 후 다음 프레임에 트리거 버튼으로 포커스 복원(WCAG 2.4.3). */
  const backTo = (ref: RefObject<HTMLButtonElement | null>) => {
    setMode('view');
    requestAnimationFrame(() => ref.current?.focus());
  };

  function startRename() {
    setName(tag.name);
    setMode('rename');
    requestAnimationFrame(() => inputRef.current?.focus());
  }
  function openDelete() {
    setMode('delete');
    requestAnimationFrame(() => cancelRef.current?.focus()); // 파괴적 흐름 → 취소에 포커스
  }
  const saveRename = () => {
    if (!canSaveName) return;
    run(() => updateTag(tag.id, { name: trimmed }), '태그 이름을 바꿨어요.', () => backTo(nameBtnRef));
  };
  const setColor = (color: TagColorKey | null) =>
    run(() => updateTag(tag.id, { color }), '태그 색을 바꿨어요.', () => backTo(colorBtnRef));
  const confirmDelete = () => run(() => deleteTag(tag.id), '태그를 삭제했어요.', () => setMode('view'));

  // ── 인라인 이름 변경 ─────────────────────────────────────────────────────
  if (mode === 'rename') {
    return (
      <li className="border-b border-[var(--border-subtle)] px-3 py-2 last:border-b-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRename();
              else if (e.key === 'Escape') backTo(nameBtnRef);
            }}
            maxLength={40}
            aria-label="새 태그 이름"
            aria-invalid={isDup}
            aria-describedby={isDup ? errId : undefined}
            aria-busy={pending}
            className={RENAME_INPUT}
          />
          <Button variant="primary" size="sm" disabled={!canSaveName} onClick={saveRename}>
            {pending ? '저장 중…' : '저장'}
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => backTo(nameBtnRef)}>
            취소
          </Button>
        </div>
        {isDup && (
          <p id={errId} role="alert" className="mt-1 text-body-xs-400 text-[var(--danger)]">
            같은 이름의 태그가 이미 있습니다.
          </p>
        )}
      </li>
    );
  }

  return (
    <li className="border-b border-[var(--border-subtle)] last:border-b-0">
      <div className="flex items-center gap-2 px-3 py-2">
        <TagChip label={tag.name} color={tag.color} size="sm" />
        <span
          className="ml-auto shrink-0 text-body-xs-400 tabular-nums text-[var(--text-muted)]"
          aria-label={`${tag.count}개 항목에 사용`}
        >
          {tag.count}회
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button ref={nameBtnRef} type="button" className={ACTION_BTN} onClick={startRename}>
            이름
          </button>
          <button
            ref={colorBtnRef}
            type="button"
            className={ACTION_BTN}
            aria-expanded={mode === 'color'}
            onClick={() => setMode(mode === 'color' ? 'view' : 'color')}
          >
            색상
          </button>
          <button
            type="button"
            className={`${ACTION_BTN} ml-1 pointer-hover:text-[var(--danger)]`}
            onClick={openDelete}
          >
            삭제
          </button>
        </div>
      </div>

      {/* 색 스와치 — 단일 선택 토글 그룹(aria-pressed, DisciplinePicker 패턴). 선택은 ring+✓(형태). */}
      {mode === 'color' && (
        <div role="group" aria-label={`${tag.name} 색상`} className="flex flex-wrap items-center gap-1.5 px-3 pb-3">
          {TAG_COLOR_KEYS.map((key) => {
            const meta = TAG_COLOR_META[key];
            const active = tag.color === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                aria-label={meta.label}
                disabled={pending}
                onClick={() => setColor(key)}
                className="flex size-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:shadow-[var(--ring-focus)]"
                style={{
                  backgroundColor: tagColorCss(meta),
                  boxShadow: active ? '0 0 0 2px var(--text-strong)' : undefined,
                }}
              >
                {active && (
                  <span aria-hidden="true" className="text-[10px] font-bold" style={{ color: ON_FILL }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={tag.color == null}
            aria-label="색 없음"
            disabled={pending}
            onClick={() => setColor(null)}
            className={`flex h-6 items-center rounded-xxs border border-[var(--border-strong)] px-2 text-body-xxs-500 text-[var(--text-muted)] focus-visible:outline-none focus-visible:shadow-[var(--ring-focus)] ${
              tag.color == null ? 'ring-2 ring-[var(--text-strong)]' : ''
            }`}
          >
            색 없음
          </button>
        </div>
      )}

      {/* 인라인 삭제 확인 — 카스케이드 경고(taggables ON DELETE CASCADE, 항목 자체는 유지). */}
      {mode === 'delete' && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2">
          <p role="alert" className="min-w-0 flex-1 text-body-xs-400 text-[var(--text-default)]">
            ‘#{tag.name}’ 태그를 삭제하면 {tag.count}개 항목에서 이 태그가 사라집니다. 항목 자체는 유지돼요.
          </p>
          <Button variant="ghost" size="sm" disabled={pending} className="text-[var(--danger)]" onClick={confirmDelete}>
            {pending ? '삭제 중…' : '삭제'}
          </Button>
          <Button ref={cancelRef} variant="secondary" size="sm" disabled={pending} onClick={() => backTo(nameBtnRef)}>
            취소
          </Button>
        </div>
      )}
    </li>
  );
}
