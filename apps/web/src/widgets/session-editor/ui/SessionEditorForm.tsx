'use client';

import { useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { logSession, logSessionInputSchema } from '@/features/log-session';
import { MediaPicker, persistMediaDrafts, type MediaDraft } from '@/features/media-upload';
import { TagInput } from '@/features/tag-filter';
import { CLASS_TYPE_LABELS } from '@/entities/session';
import { fetchTagNames } from '@/entities/tag';
import { CLASS_TYPES, type ClassType, type Discipline } from '@/shared/model/enums';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { Button } from '@/shared/ui';

import { DisciplinePicker } from './DisciplinePicker';
import { IntensityPicker } from './IntensityPicker';
import { TechniquePicker, type SessionTechniqueDraft } from './TechniquePicker';
import type { SessionEditorMode } from '@/shared/model/session-editor-store';

/**
 * SessionEditorForm — 세션 추가/편집 폼 본문 (F3 / Design §7c · Develop §12).
 *
 * 로컬 폼 상태(useState)를 소유하고 logSession Server Action으로 제출한다.
 * 90초 마찰 목표(F3-AC6): 필수는 날짜 + 종목 1개뿐 — 나머지 세부 정보는 접힌다.
 *
 * 저장은 **인프라 연결 전까지 도먼시**다(NEXT_PUBLIC_AUTH_ENABLED OFF):
 * action이 네트워크 호출 없이 안내를 반환하고, 폼은 토스트로 알린 뒤 시트를 닫지 않는다
 * (사용자가 셸을 계속 탐색하도록). 인프라 단계에서 플래그를 켜면 그대로 RPC가 동작한다.
 *
 * 미디어(F5)는 실 입력 기반 MediaPicker로 활성화됐다 — 유튜브는 인프라 전에도 완전 동작(임베드/썸네일),
 * 업로드는 초안+프리뷰만 수집(저장은 인프라 후, media_assets 행 필요). 단 영속화 전이라 드래프트는
 * 아직 RPC로 흘리지 않는다(media: [] 유지, 아래 seam 주석). 다룬 기술(F4)·태그(F7)는 연동 전이라
 * **비활성 스텁 섹션**으로 남는다(SessionCard 스텁 스타일 — 가짜 입력/로컬 배열 금지). RPC 계약(빈 배열)은 유지.
 *
 * useActionState 대신 useTransition을 쓴다 — FormData가 아닌 풍부한 로컬 상태를
 * 직접 직렬화해 action에 넘기기 때문(인증 폼과 다른 패턴).
 */

// TODO(infra): mode === 'edit' 시 sessionId로 기존 세션 prefill — 현재는 create 경로만.
//   (mode/sessionId는 호스트가 이미 내려주지만, 편집 prefill은 인프라 후로 의도적 보류)
export interface SessionEditorFormProps {
  /** 호스트가 계산한 효과적 초기 날짜('YYYY-MM-DD', presetDate ?? 오늘). */
  initialDate: string;
  mode: SessionEditorMode;
  sessionId: string | null;
  onDone: () => void;
}

/** Input 원자와 동일한 토큰 스타일의 native 컨트롤 클래스(select/textarea 공용). */
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

/** 스텁/필수 섹션 공통 라벨(SessionCard SectionLabel 관용구). */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-button-xs text-[var(--text-muted)]">{children}</p>;
}

export function SessionEditorForm({ initialDate, onDone }: SessionEditorFormProps) {
  // ── 로컬 폼 상태 (호스트가 열릴 때마다 폼을 새로 마운트 → 자동 리셋) ──
  const [trainedOn, setTrainedOn] = useState(initialDate);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [gym, setGym] = useState('');
  const [classType, setClassType] = useState<ClassType | ''>('');
  const [durationMin, setDurationMin] = useState('');
  const [intensity, setIntensity] = useState<number | null>(null);
  const [rounds, setRounds] = useState('');
  const [partners, setPartners] = useState('');
  const [memo, setMemo] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  // 다룬 기술(F4/#6-2) — 내 라이브러리에서 선택한 { technique_id, day_memo_md } 드래프트.
  const [techniqueDrafts, setTechniqueDrafts] = useState<SessionTechniqueDraft[]>([]);
  // 미디어 초안(F5) — 영속화 전이라 RPC로 흘리지 않고 로컬 수집만(아래 handleSave seam 참고).
  const [mediaDrafts, setMediaDrafts] = useState<MediaDraft[]>([]);
  // 태그 이름(F7) — TagInput으로 실제 수집되지만 영속화(이름→tags 행→tag_id)는 인프라 후(아래 handleSave seam).
  const [tagNames, setTagNames] = useState<string[]>([]);

  const [pending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  // 자동완성 후보(읽기 #5) — 사용자 기존 태그. AUTH OFF면 비활성 → [].
  const { data: tagSuggestions = [] } = useQuery({
    queryKey: ['tags', 'names'],
    queryFn: fetchTagNames,
    enabled: isAuthEnabled(),
  });

  const canSave = disciplines.length > 0 && !pending;

  function handleSave() {
    const candidate = {
      trained_on: trainedOn,
      disciplines,
      gym: gym.trim() || null,
      class_type: classType || null,
      duration_min: durationMin === '' ? null : Number(durationMin),
      intensity: intensity ?? null,
      rounds: rounds === '' ? null : Number(rounds),
      partners: partners.trim() || null,
      memo_md: memo.trim() || null,
      rating: null,
      // 태그 이름 — 서버 액션이 tags 행 생성/조회 후 taggables로 연결(#6-1).
      tag_names: tagNames,
      // 다룬 기술 — RPC가 session_techniques로 연결(#6-2).
      techniques: techniqueDrafts,
      // 미디어는 저장 시 persistMediaDrafts로 업로드/행 생성 후 media_id를 채운다(#6-3, 아래 transition).
      media: [],
    };
    const parsed = logSessionInputSchema.safeParse(candidate);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? '입력값을 확인하세요.');
      return;
    }
    startTransition(async () => {
      // 미디어 먼저 영속화(youtube=row, upload=sign→PUT→row) → media_id[]. 실패 시 세션 저장 중단.
      let mediaIds: string[] = [];
      if (mediaDrafts.length > 0) {
        try {
          mediaIds = await persistMediaDrafts(mediaDrafts);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : '미디어 업로드에 실패했습니다.');
          return;
        }
      }

      const res = await logSession({
        ...parsed.data,
        media: mediaIds.map((id) => ({ media_id: id })),
      });
      if (res.ok) {
        toast.success('저장됨');
        onDone();
        // 캘린더 읽기 갱신: ['calendar'] 프리픽스로 summaries(월 그리드)+day(선택일 상세) 모두 무효화.
        void queryClient.invalidateQueries({ queryKey: ['calendar'] });
        // 태그 갱신: 새 태그가 생겼을 수 있어 자동완성/태그 보기 무효화(#6-1).
        void queryClient.invalidateQueries({ queryKey: ['tags'] });
      } else if (res.dormant) {
        toast.info(res.error); // 인프라 전 안내 — 닫지 않음(사용자가 셸 탐색 유지).
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── 날짜 ── */}
      <Field label="날짜" htmlFor="se-date">
        <input
          id="se-date"
          type="date"
          value={trainedOn}
          onChange={(e) => setTrainedOn(e.target.value)}
          className={`h-10 ${FIELD_BASE}`}
        />
      </Field>

      {/* ── 종목 * (필수) ── */}
      <section className="flex flex-col gap-2">
        <SectionLabel>
          종목 <span className="text-[var(--primary)]">*</span>
        </SectionLabel>
        <DisciplinePicker value={disciplines} onChange={setDisciplines} />
        {disciplines.length === 0 && (
          <p className="text-body-xs-400 text-[var(--text-muted)]">종목을 1개 이상 선택하세요.</p>
        )}
      </section>

      {/* ── 세부 정보 (선택) — 접이식 ── */}
      <section className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4">
        <button
          type="button"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((v) => !v)}
          className="flex items-center justify-between rounded-xxs text-left text-body-s-500 text-[var(--text-default)] outline-none focus-visible:shadow-[var(--ring-focus)]"
        >
          <span>세부 정보 (선택)</span>
          <span aria-hidden="true" className="text-body-s-400 text-[var(--text-muted)]">
            {detailsOpen ? '접기 ▴' : '펼치기 ▾'}
          </span>
        </button>

        {detailsOpen && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="체육관" htmlFor="se-gym">
                <input
                  id="se-gym"
                  type="text"
                  value={gym}
                  onChange={(e) => setGym(e.target.value)}
                  placeholder="예: 무에타이 클럽"
                  className={`h-10 placeholder:text-[var(--text-disabled)] ${FIELD_BASE}`}
                />
              </Field>

              <Field label="유형" htmlFor="se-class-type">
                <select
                  id="se-class-type"
                  value={classType}
                  onChange={(e) => setClassType(e.target.value as ClassType | '')}
                  className={`h-10 ${FIELD_BASE}`}
                >
                  <option value="">선택 안 함</option>
                  {CLASS_TYPES.map((ct) => (
                    <option key={ct} value={ct}>
                      {CLASS_TYPE_LABELS[ct]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="시간 (분)" htmlFor="se-duration">
                <input
                  id="se-duration"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1440}
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  placeholder="60"
                  className={`h-10 placeholder:text-[var(--text-disabled)] ${FIELD_BASE}`}
                />
              </Field>

              <Field label="라운드" htmlFor="se-rounds">
                <input
                  id="se-rounds"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  value={rounds}
                  onChange={(e) => setRounds(e.target.value)}
                  placeholder="5"
                  className={`h-10 placeholder:text-[var(--text-disabled)] ${FIELD_BASE}`}
                />
              </Field>
            </div>

            {/* 강도 — 인터랙티브 점 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-body-s-500 text-[var(--text-default)]">강도</span>
              <IntensityPicker value={intensity} onChange={setIntensity} />
            </div>

            <Field label="파트너" htmlFor="se-partners">
              <input
                id="se-partners"
                type="text"
                value={partners}
                onChange={(e) => setPartners(e.target.value)}
                placeholder="함께 훈련한 사람"
                className={`h-10 placeholder:text-[var(--text-disabled)] ${FIELD_BASE}`}
              />
            </Field>

            <Field label="메모" htmlFor="se-memo">
              <textarea
                id="se-memo"
                rows={3}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="오늘 훈련에서 기억할 점"
                className={`min-h-20 resize-y py-2 placeholder:text-[var(--text-disabled)] ${FIELD_BASE}`}
              />
            </Field>
          </div>
        )}
      </section>

      {/* ── 다룬 기술 (F4/#6-2) — 내 라이브러리에서 검색·선택 → session_techniques 연결 ── */}
      <section className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4">
        <SectionLabel>다룬 기술</SectionLabel>
        <TechniquePicker value={techniqueDrafts} onChange={setTechniqueDrafts} />
      </section>

      {/* ── 미디어 (F5) — 유튜브=live, 업로드=초안+프리뷰(저장은 인프라 후) ── */}
      <section className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4">
        <SectionLabel>미디어</SectionLabel>
        <MediaPicker value={mediaDrafts} onChange={setMediaDrafts} />
        <p className="text-body-xs-400 text-[var(--text-muted)]">
          첨부한 미디어는 인프라 연결 후 세션과 함께 저장됩니다.
        </p>
      </section>

      {/* ── 태그 (F7) — 자유 태그 입력은 live, 저장은 인프라 후(tags/taggables 행 필요) ── */}
      {/* TagInput이 label prop으로 연결된 <label>을 직접 렌더하므로 별도 SectionLabel 불필요(접근성 이름 연결). */}
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
          태그는 인프라 연결 후 세션과 함께 저장됩니다.
        </p>
      </section>

      {/* ── 저장 CTA — 풀폭 빨강 lg (Design §7c). 마지막 요소(non-sticky); safe-area는 호스트가 처리 ── */}
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <Button variant="primary" size="lg" block disabled={!canSave} onClick={handleSave}>
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </div>
  );
}
