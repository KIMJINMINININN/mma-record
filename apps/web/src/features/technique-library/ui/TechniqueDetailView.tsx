'use client';

import Link from 'next/link';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';

import {
  fetchTechniqueById,
  fetchTechniqueSessions,
  CategoryChip,
  LevelChip,
  PositionChip,
} from '@/entities/technique';
import { DisciplineChip, usesBelt } from '@/entities/discipline';
import { BeltBadge } from '@/entities/rank';
import { CLASS_TYPE_LABELS, type SessionWithDisciplines } from '@/entities/session';
import { fetchTechniqueTagNames, TagChip } from '@/entities/tag';
import { fetchTechniqueMedia, YoutubeFacade, UploadMedia, ExternalLinkCard } from '@/entities/media';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { TechniqueShareButton } from '@/features/share-session';
import {
  Callout,
  ChevronLeftIcon,
  EmptyState,
  HIT_AREA_44_Y,
  MarkdownView,
  Skeleton,
} from '@/shared/ui';

import { TechniqueFavoriteStar } from './TechniqueFavoriteStar';

/**
 * TechniqueDetailView — 기술 상세 클라이언트 아일랜드 (F4-AC3 / F6 / Design §7d, §9.3).
 *
 * FSD 배치: 다중 엔티티(technique + discipline + rank + session)를 조합하므로 **feature** 레이어에
 * 둔다(TechniqueCard 결정과 동일 — entity↔entity 직접 import 회피). app 라우트(page.tsx)는
 * 이 뷰만 렌더한다.
 *
 * 데이터: TanStack Query로 entity api(fetchTechniqueById + fetchTechniqueSessions)를 읽는다.
 * 두 쿼리 모두 `enabled: isAuthEnabled()` 로 게이팅 — calendar-screen / TechniqueLibrary 와 동일 관용구.
 *
 * 4가지 상태:
 *  1) AUTH OFF(개발 셸, !enabled) → 기존 **라벨드 미리보기 플레이스홀더** 그대로(쿼리 비활성, 휴면).
 *     배지/본문은 aria-hidden "미리보기" 표식 + 데모 값(가짜 기술의 실데이터 아님 — 레이아웃 미리보기).
 *  2) AUTH ON + 로딩 → Skeleton 폴백.
 *  3) AUTH ON + not found(technique=null) → EmptyState "기술을 찾을 수 없습니다".
 *  4) AUTH ON + found → 실데이터 렌더(제목/배지/설명/주의점/미디어 스텁/역참조 세션).
 *
 * 헤더(뒤로 + 수정 링크)와 미디어 스텁(F5 미연동)은 4가지 상태에서 공통 — 레이아웃 셸로 항상 유지한다.
 */

/** 설명 section 미리보기용 지시형 placeholder 마크다운 (AUTH OFF 셸 — 실 description_md 아님). */
const DEMO_DESCRIPTION_MD =
  '이 기술의 개념과 셋업을 **마크다운**으로 정리합니다.\n\n- 그립/포지션\n- 핵심 디테일';

/** 주의점 Callout 미리보기용 지시형 placeholder 마크다운 (AUTH OFF 셸 — 실 details_md 아님). */
const DEMO_DETAILS_MD =
  '- 핵심 디테일과 자주 하는 실수를 적어두세요.\n- 견갑 고정처럼 놓치기 쉬운 포인트.';

/** dayjs 기본 로케일이 영어라 한글 요일은 직접 매핑(추가 로케일 의존 회피 — SessionCard/DayDetail 동일). */
const KR_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** "2026년 5월 22일 (목)" — 역참조 세션 한 줄 날짜 라벨. */
function sessionDateLabel(trainedOn: string): string {
  const d = dayjs(trainedOn);
  return `${d.year()}년 ${d.month() + 1}월 ${d.date()}일 (${KR_WEEKDAYS[d.day()]})`;
}

export interface TechniqueDetailViewProps {
  techniqueId: string;
}

export function TechniqueDetailView({ techniqueId }: TechniqueDetailViewProps) {
  const enabled = isAuthEnabled();

  // 단일 기술(상세 본체). 라이브러리 카드와 동일한 ['technique', id] 키 — 편집 폼과 캐시 공유.
  const { data: technique, isLoading: techniqueLoading } = useQuery({
    queryKey: ['technique', techniqueId],
    queryFn: () => fetchTechniqueById(techniqueId),
    enabled,
  });

  // 역참조 세션(이 기술을 다룬). enabled OFF면 비활성 → 기본 [](AUTH ON 분기에서만 사용).
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['technique', techniqueId, 'sessions'],
    queryFn: () => fetchTechniqueSessions(techniqueId),
    enabled,
  });

  // 붙은 태그(#6-1b 표시). 편집 폼과 동일 키 → 캐시 공유. enabled OFF면 비활성 → [].
  const { data: techniqueTags = [] } = useQuery({
    queryKey: ['technique', techniqueId, 'tags'],
    queryFn: () => fetchTechniqueTagNames(techniqueId),
    enabled,
  });

  // 붙은 미디어(#6-4 표시). 편집 폼과 동일 키 → 캐시 공유. enabled OFF면 비활성 → [].
  const { data: techniqueMedia = [] } = useQuery({
    queryKey: ['technique', techniqueId, 'media'],
    queryFn: () => fetchTechniqueMedia(techniqueId),
    enabled,
  });

  return (
    <article className="mx-auto max-w-3xl">
      {/* ── 헤더 행 — 뒤로(라이브러리) + 수정 링크 (Design §7d 헤더). 모든 상태 공통 셸. ── */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href="/techniques"
          // 시각(텍스트+아이콘, ~24px 높이) 유지 + 세로 투명 pseudo 로 hit-area 높이 44(WCAG 2.5.5).
          className={`inline-flex items-center gap-1 rounded-xxs py-1 text-button-s text-[var(--text-muted)] outline-none transition-colors pointer-hover:text-[var(--text-default)] focus-visible:shadow-[var(--ring-focus)] ${HIT_AREA_44_Y}`}
        >
          <ChevronLeftIcon width={16} height={16} />
          라이브러리
        </Link>

        {/* 즐겨찾기(별표) + 수정 — 우측 액션 그룹. 별표는 기술 로드 후에만(prefill/preview 상태엔 숨김). */}
        <div className="flex items-center gap-1">
          {technique && (
            <TechniqueFavoriteStar
              techniqueId={technique.id}
              isFavorite={technique.is_favorite}
              size="sm"
            />
          )}
          {/* 공유 링크 복사(F11 / 0024) — 별표와 동일하게 기술 로드 후에만 노출(prefill/preview 상태엔 숨김). */}
          {technique && <TechniqueShareButton techniqueId={technique.id} />}
          {/* 수정 → 편집 폼(F4-AC1). Button secondary/sm 토큰을 입은 Link. */}
          <Link
            href={`/techniques/${techniqueId}/edit`}
            // 시각 h-8(32px) 유지 + 세로 투명 pseudo 로 hit-area 높이 44(WCAG 2.5.5) — Button sm 과 동일 처리.
            className={`inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-xxs px-2.5 text-button-s font-medium select-none border border-[var(--border-strong)] bg-[var(--surface-base)] text-[var(--text-default)] outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] pointer-hover:bg-[var(--surface-sunken)] focus-visible:shadow-[var(--ring-focus)] ${HIT_AREA_44_Y}`}
          >
            수정
          </Link>
        </div>
      </div>

      {/* 본문 — AUTH 게이팅 + 로딩/미발견/실데이터 분기. */}
      {!enabled ? (
        <PreviewBody />
      ) : techniqueLoading ? (
        <LoadingBody />
      ) : !technique ? (
        <EmptyState
          title="기술을 찾을 수 없습니다"
          description="삭제되었거나 접근할 수 없는 기술입니다. 라이브러리로 돌아가세요."
        />
      ) : (
        <>
          {/* 제목 */}
          <h1 className="text-heading-l text-[var(--text-strong)]">{technique.name}</h1>

          {/* 종목 + 벨트(주짓수) OR 레벨(비벨트) + 분류 · 포지션 (Design §7d, belt↔level 상호배타) */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DisciplineChip discipline={technique.discipline} />
            {usesBelt(technique.discipline) && technique.belt && (
              <BeltBadge belt={technique.belt} stripes={technique.belt_stripes ?? 0} />
            )}
            {!usesBelt(technique.discipline) && technique.level && (
              <LevelChip level={technique.level} size="sm" />
            )}
            <CategoryChip category={technique.category} size="sm" />
            {technique.position && <PositionChip position={technique.position} size="sm" />}
          </div>

          {/* 태그(#6-1b) — 붙은 태그 칩 행. 없으면 생략(섹션 잡음 방지). */}
          {techniqueTags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {techniqueTags.map((t) => (
                <TagChip key={t} label={t} size="sm" />
              ))}
            </div>
          )}

          <hr className="my-5 border-[var(--border-subtle)]" />

          {/* 미디어(#6-4) — youtube=임베드 / upload=서명URL 재생. 없으면 스텁(레이아웃 유지). */}
          <h2 className="mb-2 text-heading-xs text-[var(--text-strong)]">미디어</h2>
          {techniqueMedia.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {techniqueMedia.map((m) =>
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
            <MediaStub />
          )}

          {/* 설명 (Design §7d — 주의점 앞). MarkdownView(F6). 없으면 안내문. */}
          <h2 className="mb-2 mt-5 text-heading-xs text-[var(--text-strong)]">설명</h2>
          <MarkdownView source={technique.description_md ?? '설명이 없습니다.'} />

          {/* 주의점 빨강 강조 박스 (Design §9.3 / §7d). details_md 있을 때만 렌더. */}
          {technique.details_md && technique.details_md.trim() !== '' && (
            <Callout variant="danger" title="주의점 / 디테일" className="mt-5">
              <MarkdownView source={technique.details_md} />
            </Callout>
          )}

          <hr className="my-5 border-[var(--border-subtle)]" />

          {/* 역참조 — 이 기술을 다룬 세션 (Design §7d) */}
          <h2 className="mb-1 text-heading-xs text-[var(--text-strong)]">이 기술을 다룬 세션</h2>
          {sessionsLoading ? (
            <div className="mt-2 space-y-2" aria-hidden="true">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : sessions.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {sessions.map((session) => (
                <ReferencedSessionRow key={session.id} session={session} />
              ))}
            </ul>
          ) : (
            <EmptyState
              title="아직 연결된 세션이 없습니다"
              description="세션 기록에서 이 기술을 추가하면 여기에 모아 보여줍니다."
            />
          )}
        </>
      )}
    </article>
  );
}

/**
 * 미디어 스텁 — 내영상 | 유튜브 나란히(데스크톱 2열, §9.1/§10.2). F5 미연동(준비 중).
 * 4가지 상태(AUTH ON found 포함)에서 동일하게 노출되는 레이아웃 셸.
 */
function MediaStub() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-hidden="true">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="flex aspect-video items-center justify-center rounded-m border border-dashed border-[var(--border-default)] bg-[var(--surface-sunken)] text-body-xs-400 text-[var(--text-disabled)]"
        >
          {i === 0 ? '내 영상 (준비 중)' : 'YouTube (준비 중)'}
        </div>
      ))}
    </div>
  );
}

/**
 * AUTH OFF(개발 셸) 미리보기 본문 — 기존 RSC 플레이스홀더 레이아웃을 그대로 옮겼다.
 * 배지/본문은 aria-hidden "미리보기" 표식 + 데모 값(가짜 기술의 실데이터 아님, AT에서 숨김).
 */
function PreviewBody() {
  return (
    <>
      {/* 제목 placeholder */}
      <h1 className="text-heading-l text-[var(--text-strong)]">기술 이름</h1>

      {/* 종목 + 벨트 + 분류·포지션 슬롯 (Design §7d) — 미리보기 데모 값. */}
      <div className="mt-2 flex flex-wrap items-center gap-2" aria-hidden="true">
        <span className="rounded-xxs border border-[var(--border-default)] px-1.5 py-0.5 text-button-xxs text-[var(--text-disabled)]">
          미리보기
        </span>
        <DisciplineChip discipline="bjj_nogi" />
        <BeltBadge belt="blue" stripes={2} />
        <CategoryChip category="submission" size="sm" />
        <PositionChip position="back_control" size="sm" />
      </div>

      {/* 태그 미리보기 데모 행(AUTH OFF 셸 — 가짜 데이터, aria-hidden). */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-hidden="true">
        <TagChip label="백테이크" size="sm" />
        <TagChip label="디테일" size="sm" />
      </div>

      <hr className="my-5 border-[var(--border-subtle)]" />

      {/* 미디어 행 placeholder */}
      <h2 className="mb-2 text-heading-xs text-[var(--text-strong)]">미디어</h2>
      <MediaStub />

      {/* 설명 — 지시형 placeholder 마크다운(F6 MarkdownView). */}
      <h2 className="mb-2 mt-5 text-heading-xs text-[var(--text-strong)]">설명</h2>
      <MarkdownView source={DEMO_DESCRIPTION_MD} />

      {/* 주의점 빨강 강조 박스 (Design §9.3 / §7d). */}
      <Callout variant="danger" title="주의점 / 디테일" className="mt-5">
        <MarkdownView source={DEMO_DETAILS_MD} />
      </Callout>

      <hr className="my-5 border-[var(--border-subtle)]" />

      {/* 역참조 — 미리보기 빈 상태. */}
      <h2 className="mb-1 text-heading-xs text-[var(--text-strong)]">이 기술을 다룬 세션</h2>
      <EmptyState
        title="아직 연결된 세션이 없습니다"
        description="세션 기록에서 이 기술을 추가하면 여기에 모아 보여줍니다."
      />
    </>
  );
}

/** AUTH ON + 로딩 — 제목/배지/본문 자리에 Skeleton 폴백. 미디어 스텁은 공통 셸로 유지. */
function LoadingBody() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-8 w-1/2" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>

      <hr className="my-5 border-[var(--border-subtle)]" />

      <h2 className="mb-2 text-heading-xs text-[var(--text-strong)]">미디어</h2>
      <MediaStub />

      <div className="mt-5 space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    </div>
  );
}

/**
 * 역참조 세션 한 줄 — 날짜 + 종목 칩(들) + 수업유형 (Design §7d).
 * SessionCard(widget) 풀 카드 대신, 상세 페이지 맥락에 맞는 컴팩트한 한 줄 항목.
 * 클릭 시 캘린더 그 날짜로 진입(/calendar?date= 딥링크 — page가 초기 선택일로 수용).
 */
function ReferencedSessionRow({ session }: { session: SessionWithDisciplines }) {
  const classTypeLabel = session.class_type ? CLASS_TYPE_LABELS[session.class_type] : null;

  return (
    <li>
      <Link
        href={`/calendar?date=${encodeURIComponent(session.trained_on)}`}
        className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 shadow-[var(--shadow-card)] outline-none transition-[colors,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-standard)] pointer-hover:border-[var(--border-strong)] pointer-hover:shadow-[var(--shadow-e3)] focus-visible:shadow-[var(--ring-focus)]"
      >
        <span className="text-body-s-500 text-[var(--text-strong)] tabular-nums">
          {sessionDateLabel(session.trained_on)}
        </span>
        <span className="flex flex-wrap items-center gap-1">
          {session.disciplines.map((d) => (
            <DisciplineChip key={d} discipline={d} size="xs" />
          ))}
        </span>
        {classTypeLabel && (
          <span className="text-body-xs-500 text-[var(--text-muted)]">
            <span aria-hidden="true" className="mr-2 text-[var(--text-disabled)]">·</span>
            {classTypeLabel}
          </span>
        )}
      </Link>
    </li>
  );
}
