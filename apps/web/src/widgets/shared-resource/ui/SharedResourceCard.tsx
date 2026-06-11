import { DisciplineChip, usesBelt } from '@/entities/discipline';
import { BeltBadge } from '@/entities/rank';
import { CategoryChip, LevelChip, PositionChip } from '@/entities/technique';
import { TagChip } from '@/entities/tag';
import { YoutubeFacade, ExternalLinkCard } from '@/entities/media';
import { CLASS_TYPE_LABELS, intensityDots } from '@/entities/session';
import { krDateHeader } from '@/widgets/day-detail/lib/calendar-grouping';
import { Callout, MarkdownView } from '@/shared/ui';
import type {
  SharedResource,
  SharedSession,
  SharedTechniqueResource,
} from '@/shared/model/shared-resource';

/**
 * widgets/shared-resource — 공유된 세션/기술을 읽기 전용으로 렌더하는 카드(표시 전용).
 * F11 토큰 공유(get_shared_resource)와 체육관 공유 상세(get_gym_shared_detail)가 **동일 jsonb 형태**라
 * 양쪽이 이 카드를 공유한다(중복 제거). 타입은 shared/model/shared-resource(최하위)에서 가져온다.
 */

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

function SectionLabel({ children }: { children: string }) {
  return <p className="text-button-xs text-[var(--text-muted)]">{children}</p>;
}

/** 세션 공유 카드 — 날짜/메타 + 다룬 기술/미디어/메모/태그(읽기 전용). */
export function SessionShareCard({ session }: { session: SharedSession }) {
  const classTypeLabel = session.class_type ? CLASS_TYPE_LABELS[session.class_type] : null;

  return (
    <article className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)]">
      <h1 className="text-heading-s text-[var(--text-strong)]">{krDateHeader(session.trained_on)}</h1>

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

      {(session.gym || session.partners) && (
        <p className="mt-2 text-body-xs-400 text-[var(--text-muted)]">
          {session.gym && <span>📍 {session.gym}</span>}
          {session.gym && session.partners && <span aria-hidden="true"> · </span>}
          {session.partners && <span>파트너: {session.partners}</span>}
        </p>
      )}

      <div className="mt-3 space-y-3 border-t border-[var(--border-subtle)] pt-3">
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

        <section className="space-y-1">
          <SectionLabel>미디어</SectionLabel>
          {session.media.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {session.media.map((m, i) =>
                m.kind === 'youtube' && m.youtube_video_id ? (
                  <YoutubeFacade key={`yt-${i}`} videoId={m.youtube_video_id} title={m.title ?? undefined} />
                ) : m.kind === 'external' && m.external_url ? (
                  <ExternalLinkCard key={`ext-${i}`} url={m.external_url} title={m.title} />
                ) : null,
              )}
            </div>
          ) : (
            <p className="text-body-xs-400 text-[var(--text-disabled)]">미디어 없음</p>
          )}
        </section>

        <section className="space-y-1">
          <SectionLabel>메모</SectionLabel>
          {session.memo_md ? (
            <MarkdownView source={session.memo_md} />
          ) : (
            <p className="text-body-xs-400 text-[var(--text-disabled)]">메모 없음</p>
          )}
        </section>

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

/** 기술 공유 카드 — 제목 + 종목/벨트(or 레벨)/분류/포지션 칩 + 태그 + 미디어 + 설명 + 주의점(읽기 전용). */
export function TechniqueShareCard({ technique }: { technique: SharedTechniqueResource }) {
  return (
    <article className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)]">
      <h1 className="text-heading-s text-[var(--text-strong)]">{technique.name}</h1>

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

      {technique.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {technique.tags.map((t) => (
            <TagChip key={t} label={t} size="xs" />
          ))}
        </div>
      )}

      <div className="mt-3 space-y-3 border-t border-[var(--border-subtle)] pt-3">
        <section className="space-y-1">
          <SectionLabel>미디어</SectionLabel>
          {technique.media.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {technique.media.map((m, i) =>
                m.kind === 'youtube' && m.youtube_video_id ? (
                  <YoutubeFacade key={`yt-${i}`} videoId={m.youtube_video_id} title={m.title ?? undefined} />
                ) : m.kind === 'external' && m.external_url ? (
                  <ExternalLinkCard key={`ext-${i}`} url={m.external_url} title={m.title} />
                ) : null,
              )}
            </div>
          ) : (
            <p className="text-body-xs-400 text-[var(--text-disabled)]">미디어 없음</p>
          )}
        </section>

        <section className="space-y-1">
          <SectionLabel>설명</SectionLabel>
          {/* ??는 빈 문자열('')을 못 잡아 공백이 되므로 trim 기준 폴백(상세 뷰와 동일 폴리시). */}
          <MarkdownView
            source={technique.description_md?.trim() ? technique.description_md : '설명이 없습니다.'}
          />
        </section>

        {technique.details_md && technique.details_md.trim() !== '' && (
          <Callout variant="danger" title="주의점 / 디테일">
            <MarkdownView source={technique.details_md} />
          </Callout>
        )}
      </div>
    </article>
  );
}

/** 봉투(type)로 분기해 알맞은 카드를 렌더. */
export function SharedResourceCard({ resource }: { resource: SharedResource }) {
  return resource.type === 'technique' ? (
    <TechniqueShareCard technique={resource.data} />
  ) : (
    <SessionShareCard session={resource.data} />
  );
}
