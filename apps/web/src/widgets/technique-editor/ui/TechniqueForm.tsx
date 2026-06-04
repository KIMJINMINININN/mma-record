'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createTechnique, updateTechnique } from '@/features/edit-technique';
import { MediaPicker, persistMediaDrafts, type MediaDraft } from '@/features/media-upload';
import { TagInput } from '@/features/tag-filter';
import { fetchTechniqueMedia, type MediaAssetRef } from '@/entities/media';
import {
  CATEGORY_LABEL,
  LEVEL_META,
  LevelChip,
  POSITION_LABEL,
  categoriesForDiscipline,
  fetchTechniqueById,
  techniqueInsertSchema,
  type TechniqueInsert,
} from '@/entities/technique';
import { fetchTagNames, fetchTechniqueTagNames } from '@/entities/tag';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { DisciplineChip, DISCIPLINE_META, STRIKING_STYLE_LABEL, usesBelt } from '@/entities/discipline';
import { BeltBadge, BELT_META } from '@/entities/rank';
import {
  BELTS,
  DISCIPLINES,
  LEVELS,
  POSITION_KINDS,
  STRIKING_STYLES,
  type Belt,
  type Discipline,
  type Level,
  type PositionKind,
  type StrikingStyle,
  type TechniqueCategory,
} from '@/shared/model/enums';
import { Button, HIT_AREA_44, Input } from '@/shared/ui';

/**
 * TechniqueForm — 기술 생성/편집 폼 본문 (F4-AC1 / Design §7d · Develop §874).
 *
 * SessionEditorForm(F3)의 관용구를 그대로 미러한다: 로컬 폼 상태(useState) 소유,
 * FIELD_BASE 토큰 select/textarea, Field/SectionLabel 헬퍼, useTransition+toast 제출,
 * MediaPicker(F5)+TagInput(F7) 조합. 폼이 여러 feature를 조합하므로 **widget**으로 배치한다
 * (widgets/session-editor 결정과 동일 — feature→feature 금지).
 *
 * 저장은 **인프라 연결 전까지 도먼시**다(NEXT_PUBLIC_AUTH_ENABLED OFF):
 * createTechnique/updateTechnique action이 네트워크 호출 없이 안내를 반환하고,
 * 폼은 토스트로 알린 뒤 그대로 둔다(사용자가 셸을 계속 탐색). 인프라 단계에서 플래그를 켜면 그대로 INSERT/UPDATE.
 *
 * 조건부 필드(PRD §4.1·§4.3):
 *  - 분류는 categoriesForDiscipline(종목)로 필터 — 종목 변경 시 더 이상 유효하지 않으면 분류 리셋.
 *  - 벨트 적합도는 주짓수(usesBelt)만 노출 — 비bjj면 belt/belt_stripes = null.
 *  - 타격 스타일은 striking만 노출 — 그 외엔 null.
 *
 * 폼은 빈/기본값으로 시작한다. **편집 prefill**(F4-AC3): mode==='edit' 이고 AUTH ON이면
 * fetchTechniqueById(techniqueId)로 기존 기술을 읽어 한 번 폼 상태에 채운다(아래 prefill 블록).
 * AUTH OFF(개발 셸)면 쿼리가 비활성 → 빈 폼 유지(휴면, calendar/library 게이팅과 동일).
 * 미디어/태그 prefill은 별도 데이터(media_links/taggables) — 후속 TODO(영속화 작업과 함께).
 * create 모드 동작은 변경 없음(빈 시작). 미디어 드래프트/태그 이름은 수집하되 저장으로
 * 흘리지 않는다(영속화 후속, 아래 handleSave seam).
 */

export interface TechniqueFormProps {
  mode: 'create' | 'edit';
  /** 편집 모드에서 대상 기술 id(생성 모드면 미지정). */
  techniqueId?: string;
}

/** Input 원자와 동일한 토큰 스타일의 native 컨트롤 클래스(select/textarea 공용) — SessionEditorForm과 동일. */
const FIELD_BASE = [
  'w-full rounded-xs px-3',
  'bg-[var(--surface-base)] text-body-m-400 text-[var(--text-strong)]',
  'border border-[var(--border-strong)]',
  'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
  'outline-none focus-visible:shadow-[var(--ring-focus)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

/** 라벨 + 컨트롤 세로 묶음(Input 원자의 래퍼와 동일 간격). */
function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-body-s-500 text-[var(--text-default)]">
        {label}
      </label>
      {children}
    </div>
  );
}

/** 필수/섹션 공통 라벨(SessionEditorForm SectionLabel 관용구). */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-button-xs text-[var(--text-muted)]">{children}</p>;
}

/** 0~4 그랄 옵션. */
const STRIPE_OPTIONS = [0, 1, 2, 3, 4] as const;

export function TechniqueForm({ mode, techniqueId }: TechniqueFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // ── 로컬 폼 상태 (빈/기본값으로 시작; 편집 모드는 아래 prefill 블록이 기존 기술로 채운다) ──
  const [name, setName] = useState('');
  const [discipline, setDiscipline] = useState<Discipline | ''>('');
  const [category, setCategory] = useState<TechniqueCategory | ''>('');
  const [position, setPosition] = useState<PositionKind | ''>('');
  const [belt, setBelt] = useState<Belt | ''>('');
  const [beltStripes, setBeltStripes] = useState<number>(0);
  const [strikingStyle, setStrikingStyle] = useState<StrikingStyle | ''>('');
  // 레벨 적합도(비벨트 종목 — 레슬링·타격·MMA). 벨트 종목은 belt 사용 → level 비움.
  const [level, setLevel] = useState<Level | ''>('');
  const [descriptionMd, setDescriptionMd] = useState('');
  const [detailsMd, setDetailsMd] = useState('');
  // 미디어 초안(F5) — 영속화 전이라 저장으로 흘리지 않고 로컬 수집만(아래 handleSave seam 참고).
  const [mediaDrafts, setMediaDrafts] = useState<MediaDraft[]>([]);
  // 태그 이름(F7) — TagInput으로 수집되지만 영속화(이름→tags 행→taggables)는 인프라 후(아래 handleSave seam).
  const [tagNames, setTagNames] = useState<string[]>([]);
  // 자동완성 후보(읽기 #5) — 사용자 기존 태그. AUTH OFF면 비활성 → [].
  const { data: tagSuggestions = [] } = useQuery({
    queryKey: ['tags', 'names'],
    queryFn: fetchTagNames,
    enabled: isAuthEnabled(),
  });

  const [pending, startTransition] = useTransition();

  // ── 편집 prefill (F4-AC3) ──
  // mode==='edit' + AUTH ON 일 때만 기존 기술을 페치한다(키는 상세/카드와 공유 → 캐시 재사용).
  // AUTH OFF면 비활성 → existing=undefined → 폼은 빈 채로(휴면 셸) 유지.
  const isEdit = mode === 'edit' && !!techniqueId;
  const { data: existing } = useQuery({
    queryKey: ['technique', techniqueId],
    queryFn: () => fetchTechniqueById(techniqueId!),
    enabled: isEdit && isAuthEnabled(),
  });

  // 편집 시 기존 태그 이름(prefill #6-1) — 저장 재동기화가 빈 값으로 태그를 지우지 않게 한다.
  const { data: existingTagNames } = useQuery({
    queryKey: ['technique', techniqueId, 'tags'],
    queryFn: () => fetchTechniqueTagNames(techniqueId!),
    enabled: isEdit && isAuthEnabled(),
  });

  // 편집 시 기존 연결 미디어(prefill #6-4) — 업로드 자산은 File 복원 불가하므로 드래프트가 아닌
  // "유지/제거" 참조로 다룬다. keptMedia(유지분) + 새 mediaDrafts = 저장 시 desired 미디어 집합.
  const { data: existingMedia } = useQuery({
    queryKey: ['technique', techniqueId, 'media'],
    queryFn: () => fetchTechniqueMedia(techniqueId!),
    enabled: isEdit && isAuthEnabled(),
  });
  const [keptMedia, setKeptMedia] = useState<MediaAssetRef[]>([]);

  // 같은 기술을 두 번 채워 사용자 편집을 덮어쓰지 않도록, prefill 한 기술 id를 기억한다.
  // (existing 이 새 id로 바뀌면 다시 채운다 — id 변화 기준 1회.)
  const prefilledIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!existing) return;
    if (prefilledIdRef.current === existing.id) return;
    prefilledIdRef.current = existing.id;

    setName(existing.name);
    setDiscipline(existing.discipline);
    setCategory(existing.category);
    setPosition(existing.position ?? '');
    setBelt(existing.belt ?? '');
    setBeltStripes(existing.belt_stripes ?? 0);
    setStrikingStyle(existing.striking_style ?? '');
    setLevel(existing.level ?? '');
    setDescriptionMd(existing.description_md ?? '');
    setDetailsMd(existing.details_md ?? '');
    // 미디어 드래프트는 별도 테이블(media_links) — prefill은 후속 TODO(#6-3).
  }, [existing]);

  // 태그 prefill(#6-1) — 기존 기술 태그 이름을 id 단위로 1회 채운다(존재 prefill과 독립 타이밍).
  const prefilledTagsIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isEdit || !techniqueId || existingTagNames === undefined) return;
    if (prefilledTagsIdRef.current === techniqueId) return;
    prefilledTagsIdRef.current = techniqueId;
    setTagNames(existingTagNames);
  }, [existingTagNames, isEdit, techniqueId]);

  // 미디어 prefill(#6-4) — 기존 연결 미디어를 keptMedia로 1회 채운다(이후 사용자가 ×로 제거 가능).
  const prefilledMediaIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isEdit || !techniqueId || existingMedia === undefined) return;
    if (prefilledMediaIdRef.current === techniqueId) return;
    prefilledMediaIdRef.current = techniqueId;
    setKeptMedia(existingMedia);
  }, [existingMedia, isEdit, techniqueId]);

  // 종목에 따라 가능한 분류 목록(PRD §4.2). 종목 미선택이면 빈 목록.
  const categoryOptions = useMemo<TechniqueCategory[]>(
    () => (discipline ? categoriesForDiscipline(discipline) : []),
    [discipline],
  );

  const showBelt = discipline !== '' && usesBelt(discipline);
  const showStriking = discipline === 'striking';
  // 레벨은 비벨트 종목(레슬링·타격·MMA)만 — belt 와 상호배타(PRD §3).
  const showLevel = discipline !== '' && !usesBelt(discipline);

  // 이름·종목·분류가 필수(***) — 셋이 채워지고 제출 중이 아닐 때만 저장 가능.
  // 편집 모드에선 태그·미디어 prefill이 로드되기 전 저장을 막는다 — 빈 집합 재동기화로
  // 기존 연결이 끊기는 race 방지(#6-1·#6-4). create 모드는 prefill 없으니 영향 없음.
  const canSave =
    name.trim() !== '' &&
    discipline !== '' &&
    category !== '' &&
    !pending &&
    (!isEdit || (existingTagNames !== undefined && existingMedia !== undefined));

  /** 종목 변경 — 현재 분류가 새 종목에서 유효하지 않으면 리셋. 벨트/타격 필드도 비-해당 종목이면 비운다. */
  function handleDisciplineChange(next: Discipline | '') {
    setDiscipline(next);
    if (next === '') {
      setCategory('');
      return;
    }
    // 현재 선택한 분류가 새 종목 목록에 없으면 리셋.
    if (category !== '' && !categoriesForDiscipline(next).includes(category)) {
      setCategory('');
    }
    // 벨트는 주짓수에서만, 타격 스타일은 striking에서만 의미가 있다 — 해당 안 되면 비운다.
    if (!usesBelt(next)) {
      setBelt('');
      setBeltStripes(0);
    }
    if (next !== 'striking') {
      setStrikingStyle('');
    }
    // 레벨은 비벨트 종목만 — 벨트 종목(주짓수)으로 바뀌면 비운다(belt 와 상호배타).
    if (usesBelt(next)) {
      setLevel('');
    }
  }

  function handleSave() {
    // canSave 가드와 중복이나 타입 좁히기 + 명시적 안내용(zod 일반 enum 메시지 대신).
    if (discipline === '') {
      toast.error('종목을 선택하세요.');
      return;
    }
    if (category === '') {
      toast.error('분류를 선택하세요.');
      return;
    }

    const candidate = {
      name: name.trim(),
      discipline,
      category,
      position: position === '' ? null : position,
      striking_style: showStriking && strikingStyle !== '' ? strikingStyle : null,
      belt: showBelt && belt !== '' ? belt : null,
      belt_stripes: showBelt && belt !== '' ? beltStripes : null,
      level: showLevel && level !== '' ? level : null,
      description_md: descriptionMd.trim() || null,
      details_md: detailsMd.trim() || null,
      visibility: 'private' as const,
    };

    const parsed = techniqueInsertSchema.safeParse(candidate);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? '입력값을 확인하세요.');
      return;
    }
    const payload: TechniqueInsert = parsed.data;

    startTransition(async () => {
      // 미디어 먼저 영속화(#6-4): 새 드래프트(youtube=row, upload=sign→PUT→row) → 새 media_id[].
      // desired = 유지한 기존 미디어 id + 새 id. 편집은 이 집합으로 media_links 재동기화, 생성은 그대로 연결.
      let desiredMediaIds: string[];
      try {
        const newMediaIds = await persistMediaDrafts(mediaDrafts);
        desiredMediaIds = [...keptMedia.map((m) => m.id), ...newMediaIds];
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '미디어 업로드에 실패했습니다.');
        return;
      }

      // 태그 이름·미디어 id를 액션에 함께 넘긴다(#6-1·#6-4) — 서버가 taggables/media_links 연결/재동기화.
      const res =
        mode === 'edit' && techniqueId
          ? await updateTechnique(techniqueId, payload, tagNames, desiredMediaIds)
          : await createTechnique(payload, tagNames, desiredMediaIds);

      if (res.ok) {
        // 목록 쿼리(['techniques',*])를 무효화해 라이브러리가 새/수정 기술로 갱신되게 한다(navigation 전).
        queryClient.invalidateQueries({ queryKey: ['techniques'] });
        // 태그 갱신(#6-1): 새 태그 생성/연결 변화 → 자동완성·태그 보기 무효화.
        queryClient.invalidateQueries({ queryKey: ['tags'] });
        // 상세/연결 갱신(#6-4): 이 기술의 미디어·태그·역참조 캐시 무효화(편집 후 재진입 시 최신).
        if (techniqueId) queryClient.invalidateQueries({ queryKey: ['technique', techniqueId] });
        toast.success('저장됨');
        if (mode === 'create') {
          router.push('/techniques');
        } else {
          router.back();
        }
      } else if (res.dormant) {
        toast.info(res.error); // 인프라 전 안내 — 폼 유지(사용자가 셸 탐색).
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── 이름 * (필수) ── */}
      <Input
        label="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="예: 베림볼로"
        autoComplete="off"
      />

      {/* ── 종목 * (필수, 단일 선택) ── */}
      <section className="flex flex-col gap-2">
        <Field label="종목" htmlFor="tf-discipline">
          <select
            id="tf-discipline"
            value={discipline}
            onChange={(e) => handleDisciplineChange(e.target.value as Discipline | '')}
            className={`h-10 ${FIELD_BASE}`}
          >
            <option value="">선택하세요</option>
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {DISCIPLINE_META[d].label}
              </option>
            ))}
          </select>
        </Field>
        {discipline === '' ? (
          <p className="text-body-xs-400 text-[var(--text-muted)]">종목을 선택하세요.</p>
        ) : (
          // 선택 종목 미리보기 칩(live).
          <DisciplineChip discipline={discipline} />
        )}
      </section>

      {/* ── 분류 * (필수, 종목별 필터) ── */}
      <Field label="분류" htmlFor="tf-category">
        <select
          id="tf-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as TechniqueCategory | '')}
          disabled={discipline === ''}
          className={`h-10 ${FIELD_BASE}`}
        >
          <option value="">{discipline === '' ? '종목을 먼저 선택' : '선택하세요'}</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </Field>

      {/* ── 포지션 (선택) ── */}
      <Field label="포지션 (선택)" htmlFor="tf-position">
        <select
          id="tf-position"
          value={position}
          onChange={(e) => setPosition(e.target.value as PositionKind | '')}
          className={`h-10 ${FIELD_BASE}`}
        >
          <option value="">선택 안 함</option>
          {POSITION_KINDS.map((p) => (
            <option key={p} value={p}>
              {POSITION_LABEL[p]}
            </option>
          ))}
        </select>
      </Field>

      {/* ── 벨트 적합도 (주짓수만, 선택) ── */}
      {showBelt && (
        <section className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4">
          <SectionLabel>벨트 적합도 (선택)</SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="벨트" htmlFor="tf-belt">
              <select
                id="tf-belt"
                value={belt}
                onChange={(e) => setBelt(e.target.value as Belt | '')}
                className={`h-10 ${FIELD_BASE}`}
              >
                <option value="">선택 안 함</option>
                {BELTS.map((b) => (
                  <option key={b} value={b}>
                    {BELT_META[b].label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="그랄(stripe)" htmlFor="tf-belt-stripes">
              <select
                id="tf-belt-stripes"
                value={beltStripes}
                onChange={(e) => setBeltStripes(Number(e.target.value))}
                disabled={belt === ''}
                className={`h-10 ${FIELD_BASE}`}
              >
                {STRIPE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {belt !== '' && (
            // 벨트 미리보기 배지(live).
            <div className="pt-1">
              <BeltBadge belt={belt} stripes={beltStripes} size="md" />
            </div>
          )}
        </section>
      )}

      {/* ── 레벨 적합도 (비벨트 종목만, 선택 — belt 와 상호배타) ── */}
      {showLevel && (
        <section className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4">
          <Field label="레벨 적합도 (선택)" htmlFor="tf-level">
            <select
              id="tf-level"
              value={level}
              onChange={(e) => setLevel(e.target.value as Level | '')}
              className={`h-10 ${FIELD_BASE}`}
            >
              <option value="">선택 안 함</option>
              {LEVELS.map((lv) => (
                <option key={lv} value={lv}>
                  {LEVEL_META[lv].label}
                </option>
              ))}
            </select>
          </Field>
          {level !== '' && (
            // 레벨 미리보기 배지(live).
            <div className="pt-1">
              <LevelChip level={level} size="sm" />
            </div>
          )}
        </section>
      )}

      {/* ── 타격 스타일 (타격만, 선택) ── */}
      {showStriking && (
        <Field label="타격 스타일 (선택)" htmlFor="tf-striking-style">
          <select
            id="tf-striking-style"
            value={strikingStyle}
            onChange={(e) => setStrikingStyle(e.target.value as StrikingStyle | '')}
            className={`h-10 ${FIELD_BASE}`}
          >
            <option value="">선택 안 함</option>
            {STRIKING_STYLES.map((s) => (
              <option key={s} value={s}>
                {STRIKING_STYLE_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* ── 설명 (description_md) ── */}
      <Field label="설명" htmlFor="tf-description">
        <textarea
          id="tf-description"
          rows={4}
          value={descriptionMd}
          onChange={(e) => setDescriptionMd(e.target.value)}
          placeholder="이 기술의 개념과 셋업을 마크다운으로 정리합니다."
          className={`min-h-24 resize-y py-2 placeholder:text-[var(--text-disabled)] ${FIELD_BASE}`}
        />
      </Field>

      {/* ── 주의점 / 디테일 (details_md, F6 — 상세 페이지가 Callout으로 렌더) ── */}
      <Field label="주의점 / 디테일" htmlFor="tf-details">
        <textarea
          id="tf-details"
          rows={3}
          value={detailsMd}
          onChange={(e) => setDetailsMd(e.target.value)}
          placeholder="자주 하는 실수, 놓치기 쉬운 핵심 디테일."
          className={`min-h-20 resize-y py-2 placeholder:text-[var(--text-disabled)] ${FIELD_BASE}`}
        />
      </Field>

      {/* ── 미디어 (F5/#6-4) — 편집: 기존 연결 유지/제거 + 공통: 새 첨부(유튜브 live / 업로드) ── */}
      <section className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4">
        <SectionLabel>미디어</SectionLabel>

        {/* 편집 모드: 기존 연결 미디어 — × 로 제거(저장 시 연결만 끊김, 자산은 보존). */}
        {keptMedia.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {keptMedia.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded-xs border border-[var(--border-subtle)] bg-[var(--surface-base)] px-2.5 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-body-s-400 text-[var(--text-default)]">
                  {m.kind === 'youtube' ? 'YouTube 영상' : '내 영상'}
                  {m.title ? ` · ${m.title}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setKeptMedia((prev) => prev.filter((x) => x.id !== m.id))}
                  aria-label="연결된 미디어 제거"
                  // 시각 18px 유지 + 중앙 투명 pseudo 로 hit-area 44(WCAG 2.5.5). 부모 행은 비-clip.
                  className={`shrink-0 rounded-full p-1 text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--danger)] focus-visible:shadow-[var(--ring-focus)] ${HIT_AREA_44}`}
                >
                  <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
                    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* 새 첨부(드래프트) — 저장 시 업로드/행 생성 후 기술에 연결. */}
        <MediaPicker value={mediaDrafts} onChange={setMediaDrafts} />
        <p className="text-body-xs-400 text-[var(--text-muted)]">
          유튜브 링크 또는 60초·100MB 이내 영상(mp4·mov)을 첨부할 수 있어요.
        </p>
      </section>

      {/* ── 태그 (F7) — 자유 태그 입력은 live, 저장은 인프라 후(tags/taggables 행 필요) ── */}
      <section className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4">
        <TagInput
          value={tagNames}
          onChange={setTagNames}
          allowCreate
          suggestions={tagSuggestions}
          label="태그"
          placeholder="태그 추가 (예: 백테이크)"
        />
        <p className="text-body-xs-400 text-[var(--text-muted)]">
          태그는 인프라 연결 후 기술과 함께 저장됩니다.
        </p>
      </section>

      {/* ── 저장 CTA — 풀폭 빨강 lg (Design §7d). name·discipline 필수, pending 중 잠금 ── */}
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <Button variant="primary" size="lg" block disabled={!canSave} onClick={handleSave}>
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </div>
  );
}
