import { MarkdownView } from '@/shared/ui';
import { SessionFavoriteStar } from '@/features/session-favorite';
import { SessionShareButton } from '@/features/share-session';
import { GymShareToggle } from '@/features/gym-share';

import { SessionEditButton } from './SessionEditButton';
import { DisciplineChip } from '@/entities/discipline';
import { TagChip } from '@/entities/tag';
import { YoutubeFacade, UploadMedia, ExternalLinkCard } from '@/entities/media';
import {
  CLASS_TYPE_LABELS,
  intensityDots,
  type SessionWithDisciplines,
} from '@/entities/session';

/**
 * SessionCard — Day Detail의 단일 세션 카드 (Design §7b / F2-AC3).
 *
 * 헤더: DisciplineChip(들) + 수업유형 라벨 + 시간(분) + 강도 5단계 점(●●●○○).
 * 메타: 체육관 · 파트너 한 줄.
 * 본문: 다룬 기술 / 미디어 / 메모 / 태그 섹션. 다룬 기술·미디어·태그는 더 깊은 데이터(세션-기술
 *   로그, media, tags)에 의존하므로 지금은 섹션 라벨 + 플레이스홀더만(가짜 데이터 금지).
 *   메모(memo_md)는 세션 본체의 실데이터 — 값이 있으면 MarkdownView로 XSS-안전 렌더(F6).
 *
 * 표시 전용(상호작용 없음) → 서버 컴포넌트. 토큰 + `--shadow-card`로 클린 카드.
 */

export interface SessionCardProps {
  session: SessionWithDisciplines;
}

/** 강도 5단계 점 (Design §7b ●●●○○). null/0이면 전부 빈 점. */
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

/** "다룬 기술 / 미디어 / 메모 / 태그" 공통 섹션 라벨 헤더. */
function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-button-xs text-[var(--text-muted)]">{children}</p>
  );
}

export function SessionCard({ session }: SessionCardProps) {
  const classTypeLabel = session.class_type ? CLASS_TYPE_LABELS[session.class_type] : null;

  return (
    <article className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 shadow-[var(--shadow-card)] md:p-4">
      {/* 헤더 — 종목 칩(들) + 유형 · 시간 · 강도 */}
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="flex flex-wrap items-center gap-1">
          {session.disciplines.map((d) => (
            <DisciplineChip key={d} discipline={d} size="sm" />
          ))}
        </span>

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

        {/* 우측 액션 — 체육관 공유(소속 시) + 공유 링크 복사 + 수정 진입 + 즐겨찾기 별표(모두 클라 아일랜드). */}
        <span className="ml-auto flex items-center gap-0.5">
          <GymShareToggle resourceType="session" resourceId={session.id} />
          <SessionShareButton sessionId={session.id} />
          <SessionEditButton sessionId={session.id} trainedOn={session.trained_on} />
          <SessionFavoriteStar sessionId={session.id} isFavorite={session.is_favorite} />
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

      {/* 본문 섹션 — 데이터 미연동(F3/F4/F5 이후). 라벨 + 플레이스홀더만. */}
      <div className="mt-3 space-y-3 border-t border-[var(--border-subtle)] pt-3">
        {/* 다룬 기술(#6-2) — 종목 칩 + 기술명 (+ 있으면 그날 메모). 없으면 안내. */}
        <section className="space-y-1">
          <SectionLabel>다룬 기술</SectionLabel>
          {session.techniques.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {session.techniques.map((t) => (
                <li key={t.id} className="flex flex-col gap-0.5">
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

        {/* 미디어(#6-3b) — youtube=임베드 / upload=서명URL 재생. 없으면 안내. */}
        <section className="space-y-1">
          <SectionLabel>미디어</SectionLabel>
          {session.media.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {session.media.map((m) =>
                m.kind === 'youtube' && m.youtube_video_id ? (
                  <YoutubeFacade
                    key={m.id}
                    videoId={m.youtube_video_id}
                    title={m.title ?? undefined}
                  />
                ) : m.kind === 'upload' && m.storage_path ? (
                  <UploadMedia key={m.id} storagePath={m.storage_path} thumbnailPath={m.thumbnail_path} />
                ) : m.kind === 'external' && m.external_url ? (
                  <ExternalLinkCard key={m.id} url={m.external_url} title={m.title} />
                ) : null,
              )}
            </div>
          ) : (
            <p className="text-body-xs-400 text-[var(--text-disabled)]">미디어 없음</p>
          )}
        </section>

        {/* 메모(memo_md)는 세션 본체의 실데이터 — 값이 있으면 마크다운 렌더(F6), 없으면 플레이스홀더. */}
        <section className="space-y-1">
          <SectionLabel>메모</SectionLabel>
          {session.memo_md ? (
            <MarkdownView source={session.memo_md} />
          ) : (
            <p className="text-body-xs-400 text-[var(--text-disabled)]">메모 없음</p>
          )}
        </section>

        {/* 태그(#6-1b) — 세션에 붙은 태그 칩. 없으면 안내. */}
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
