'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import { DisciplineChip, usesBelt } from '@/entities/discipline';
import { BeltBadge } from '@/entities/rank';
import { CategoryChip, LevelChip, PositionChip } from '@/entities/technique';
import { TagChip } from '@/entities/tag';
import { YoutubeFacade, ExternalLinkCard } from '@/entities/media';
import { CLASS_TYPE_LABELS, intensityDots } from '@/entities/session';
import { krDateHeader } from '@/widgets/day-detail/lib/calendar-grouping';
import { Callout, EmptyState, MarkdownView, Skeleton } from '@/shared/ui';
import type {
  Belt,
  ClassType,
  Discipline,
  Level,
  PositionKind,
  TechniqueCategory,
} from '@/shared/model/enums';

/**
 * ShareView — 공유 토큰으로 받은 자원(세션 OR 기술)을 익명 읽기 전용으로 렌더
 * (F11 / 0022_shares.sql · 0024_share_technique.sql).
 *
 * (app) 그룹 밖이라 인증 가드가 없다 → 브라우저 Supabase 클라이언트로 `get_shared_resource(p_token)`
 * 봉투 RPC(security definer, anon grant)를 호출한다. RPC가 `{type, data}` 합성 jsonb를 돌려주며,
 * type('session'|'technique')으로 분기해 각 카드를 렌더한다. RLS 우회는 토큰 보유자 + 함수 범위로만
 * 한정된다(업로드 미디어는 anon 서명URL 불가라 youtube/external 미디어만 포함).
 *
 * SessionWithDisciplines / Technique(id/is_favorite 보유)와 형태가 다르므로(jsonb, id 없음) 기존
 * 카드를 재사용하지 않고 전용 읽기 뷰로 작성한다 — 카드 스타일(토큰·--shadow-card)만 참고. null/빈
 * 반환이면 "존재하지 않거나 만료된 공유" 안내를 보여준다(토큰 추측/만료/삭제 모두 동일 처리 — 자원
 * 존재 여부를 누설하지 않음).
 */

/** RPC가 돌려주는 세션 내 기술 항목 jsonb 형태(읽기 전용). get_shared_session의 techniques 항목과 1:1. */
interface SharedSessionTechnique {
  name: string;
  discipline: Discipline;
  day_memo_md: string | null;
}
interface SharedMedia {
  kind: 'youtube' | 'external';
  youtube_video_id: string | null;
  external_url: string | null;
  title: string | null;
}
interface SharedSession {
  trained_on: string;
  gym: string | null;
  class_type: ClassType | null;
  duration_min: number | null;
  intensity: number | null;
  rounds: number | null;
  partners: string | null;
  memo_md: string | null;
  disciplines: Discipline[];
  techniques: SharedSessionTechnique[];
  tags: string[];
  media: SharedMedia[];
}

/** RPC가 돌려주는 기술 jsonb 형태(읽기 전용). get_shared_technique의 jsonb_build_object와 1:1. */
interface SharedTechniqueResource {
  name: string;
  discipline: Discipline;
  category: TechniqueCategory;
  position: PositionKind | null;
  striking_style: string | null;
  belt: Belt | null;
  belt_stripes: number | null;
  level: Level | null;
  description_md: string | null;
  details_md: string | null;
  tags: string[];
  media: SharedMedia[];
}

/** 봉투 RPC 반환 — type 으로 분기. data 가 null 이면(자원 없음) 전체를 null 로 취급. */
type SharedResource =
  | { type: 'session'; data: SharedSession }
  | { type: 'technique'; data: SharedTechniqueResource };

/** 강도 5단계 점(●●●○○) — SessionCard와 동일 표현(표시 전용). */
function IntensityDots({ intensity }: { intensity: number | null }) {
  const dots = intensityDots(intensity ?? 0);
  return (
    <span
      className="inline-flex items-center gap-0.5 align-middle"
      role="img"
      aria-label={`강도 ${intensity ?? 0} / 5`}
    >
      {dots.map((filled, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={[
            'size-1.5 rounded-full',
            filled ? 'bg-[var(--primary)]' : 'bg-[var(--border-strong)]',
          ].join(' ')}
        />
      ))}
    </span>
  );
}

/** 섹션 라벨 — SessionCard와 동일 타이포. */
function SectionLabel({ children }: { children: string }) {
  return <p className="text-button-xs text-[var(--text-muted)]">{children}</p>;
}

/** 공유 데이터를 가져오는 쿼리 훅 — 토큰별 캐시. 봉투 RPC가 null이거나 data가 null이면 빈 공유로 취급. */
function useSharedResource(token: string) {
  return useQuery<SharedResource | null>({
    queryKey: ['share', 'resource', token],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('get_shared_resource', { p_token: token });
      if (error) throw new Error(error.message);
      // RPC는 매칭 없으면 0행 → data=null. 봉투의 data(자원 본체)도 null이면 빈 공유로 취급.
      const envelope = (data as SharedResource | null) ?? null;
      if (!envelope || !envelope.data) return null;
      return envelope;
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function ShareView({ token }: { token: string }) {
  const { data: result, isLoading, isError } = useSharedResource(token);

  if (isLoading) return <ShareViewSkeleton />;

  // 오류(네트워크/RPC 실패)거나 매칭 없음(null) → 동일 안내(자원 존재 여부 누설 방지).
  if (isError || !result) {
    return (
      <EmptyState
        title="존재하지 않거나 만료된 공유예요"
        description="링크가 잘못되었거나, 작성자가 공유를 해제했을 수 있어요."
      />
    );
  }

  return result.type === 'technique' ? (
    <TechniqueShareCard technique={result.data} />
  ) : (
    <SessionShareCard session={result.data} />
  );
}

/** 세션 공유 카드 — 날짜/메타 + 다룬 기술/미디어/메모/태그(읽기 전용). */
function SessionShareCard({ session }: { session: SharedSession }) {
  const classTypeLabel = session.class_type ? CLASS_TYPE_LABELS[session.class_type] : null;

  return (
    <article className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)]">
      {/* 날짜 헤더 */}
      <h1 className="text-heading-s text-[var(--text-strong)]">{krDateHeader(session.trained_on)}</h1>

      {/* 종목 칩 + 유형 · 시간 · 강도 */}
      <header className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {session.disciplines.length > 0 && (
          <span className="flex flex-wrap items-center gap-1">
            {session.disciplines.map((d) => (
              <DisciplineChip key={d} discipline={d} size="sm" />
            ))}
          </span>
        )}

        <span className="flex items-center gap-1.5 text-body-xs-500 text-[var(--text-default)]">
          {classTypeLabel && <span>{classTypeLabel}</span>}
          {session.duration_min != null && (
            <>
              <span aria-hidden="true" className="text-[var(--text-disabled)]">·</span>
              <span className="tabular-nums">{session.duration_min}분</span>
            </>
          )}
          {session.intensity != null && (
            <>
              <span aria-hidden="true" className="text-[var(--text-disabled)]">·</span>
              <span className="flex items-center gap-1 text-[var(--text-muted)]">
                강도 <IntensityDots intensity={session.intensity} />
              </span>
            </>
          )}
        </span>
      </header>

      {/* 메타 — 체육관 · 파트너 */}
      {(session.gym || session.partners) && (
        <p className="mt-2 text-body-xs-400 text-[var(--text-muted)]">
          {session.gym && <span>📍 {session.gym}</span>}
          {session.gym && session.partners && <span aria-hidden="true"> · </span>}
          {session.partners && <span>파트너: {session.partners}</span>}
        </p>
      )}

      <div className="mt-3 space-y-3 border-t border-[var(--border-subtle)] pt-3">
        {/* 다룬 기술 — 종목 칩 + 기술명 (+ 그날 메모). */}
        <section className="space-y-1">
          <SectionLabel>다룬 기술</SectionLabel>
          {session.techniques.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {session.techniques.map((t, i) => (
                <li key={`${t.name}-${i}`} className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5">
                    <DisciplineChip discipline={t.discipline} size="xs" />
                    <span className="min-w-0 truncate text-body-s-500 text-[var(--text-strong)]">
                      {t.name}
                    </span>
                  </span>
                  {t.day_memo_md && t.day_memo_md.trim() !== '' && (
                    <div className="pl-1 text-body-xs-400 text-[var(--text-muted)]">
                      <MarkdownView source={t.day_memo_md} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-xs-400 text-[var(--text-disabled)]">다룬 기술 없음</p>
          )}
        </section>

        {/* 미디어 — youtube=facade / external=링크 카드(업로드는 RPC에서 제외됨). */}
        <section className="space-y-1">
          <SectionLabel>미디어</SectionLabel>
          {session.media.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {session.media.map((m, i) =>
                m.kind === 'youtube' && m.youtube_video_id ? (
                  <YoutubeFacade
                    key={`yt-${i}`}
                    videoId={m.youtube_video_id}
                    title={m.title ?? undefined}
                  />
                ) : m.kind === 'external' && m.external_url ? (
                  <ExternalLinkCard key={`ext-${i}`} url={m.external_url} title={m.title} />
                ) : null,
              )}
            </div>
          ) : (
            <p className="text-body-xs-400 text-[var(--text-disabled)]">미디어 없음</p>
          )}
        </section>

        {/* 메모(memo_md) — 값 있으면 마크다운 안전 렌더(F6). */}
        <section className="space-y-1">
          <SectionLabel>메모</SectionLabel>
          {session.memo_md ? (
            <MarkdownView source={session.memo_md} />
          ) : (
            <p className="text-body-xs-400 text-[var(--text-disabled)]">메모 없음</p>
          )}
        </section>

        {/* 태그 — 읽기 전용 칩(클릭/제거 없음). */}
        <section className="space-y-1">
          <SectionLabel>태그</SectionLabel>
          {session.tags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {session.tags.map((t) => (
                <TagChip key={t} label={t} size="xs" />
              ))}
            </div>
          ) : (
            <p className="text-body-xs-400 text-[var(--text-disabled)]">태그 없음</p>
          )}
        </section>
      </div>
    </article>
  );
}

/**
 * 기술 공유 카드 — 제목 + 종목/벨트(or 레벨)/분류/포지션 칩 + 태그 + 미디어 + 설명 + 주의점(읽기 전용).
 * TechniqueDetailView 의 found 본문에 충실하되 역참조 세션(이 기술을 다룬)은 소유자 사생활이라 생략한다.
 */
function TechniqueShareCard({ technique }: { technique: SharedTechniqueResource }) {
  return (
    <article className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)]">
      {/* 제목 */}
      <h1 className="text-heading-s text-[var(--text-strong)]">{technique.name}</h1>

      {/* 종목 + 벨트(주짓수) OR 레벨(비벨트) + 분류 · 포지션 (belt↔level 상호배타 — 상세 뷰와 동일). */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <DisciplineChip discipline={technique.discipline} size="sm" />
        {usesBelt(technique.discipline) && technique.belt && (
          <BeltBadge belt={technique.belt} stripes={technique.belt_stripes ?? 0} />
        )}
        {!usesBelt(technique.discipline) && technique.level && (
          <LevelChip level={technique.level} size="sm" />
        )}
        <CategoryChip category={technique.category} size="sm" />
        {technique.position && <PositionChip position={technique.position} size="sm" />}
      </div>

      {/* 태그 — 붙은 태그 칩 행. 없으면 생략(섹션 잡음 방지 — 상세 뷰와 동일). */}
      {technique.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {technique.tags.map((t) => (
            <TagChip key={t} label={t} size="xs" />
          ))}
        </div>
      )}

      <div className="mt-3 space-y-3 border-t border-[var(--border-subtle)] pt-3">
        {/* 미디어 — youtube=facade / external=링크 카드(업로드는 RPC에서 제외됨). */}
        <section className="space-y-1">
          <SectionLabel>미디어</SectionLabel>
          {technique.media.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {technique.media.map((m, i) =>
                m.kind === 'youtube' && m.youtube_video_id ? (
                  <YoutubeFacade
                    key={`yt-${i}`}
                    videoId={m.youtube_video_id}
                    title={m.title ?? undefined}
                  />
                ) : m.kind === 'external' && m.external_url ? (
                  <ExternalLinkCard key={`ext-${i}`} url={m.external_url} title={m.title} />
                ) : null,
              )}
            </div>
          ) : (
            <p className="text-body-xs-400 text-[var(--text-disabled)]">미디어 없음</p>
          )}
        </section>

        {/* 설명 — MarkdownView(F6). 없으면 안내문(상세 뷰와 동일 처리). */}
        <section className="space-y-1">
          <SectionLabel>설명</SectionLabel>
          <MarkdownView source={technique.description_md ?? '설명이 없습니다.'} />
        </section>

        {/* 주의점 빨강 강조 박스 (Design §9.3 / §7d). details_md 있을 때만 렌더. */}
        {technique.details_md && technique.details_md.trim() !== '' && (
          <Callout variant="danger" title="주의점 / 디테일">
            <MarkdownView source={technique.details_md} />
          </Callout>
        )}
      </div>
    </article>
  );
}

/** 로딩 스켈레톤 — 카드 형태(헤더 + 본문 섹션). loading.tsx와 별개로 쿼리 로딩 동안 표시. */
function ShareViewSkeleton() {
  return (
    <div
      className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)]"
      aria-busy="true"
      aria-label="공유 로딩 중"
    >
      <Skeleton className="h-6 w-40" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-7 w-24 rounded-xxs" />
        <Skeleton className="h-7 w-16 rounded-xxs" />
      </div>
      <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-3/4" />
        ))}
      </div>
    </div>
  );
}
