'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { Button, EmptyState, StatsIcon } from '@/shared/ui';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { useSessionEditorStore } from '@/shared/model/session-editor-store';
import {
  DATE_FMT,
  computeTrainingStats,
  fetchAllSessionStatRows,
  fetchTopTechniques,
  streakDays,
} from '@/entities/session';
import { StatsContent, StatsSkeleton } from '@/widgets/stats';

/**
 * StatsScreen — F10 통계 대시보드 클라이언트 아일랜드 (PRD §F10 / 구현계획 §2, Pattern A).
 *
 * 두 쿼리(세션 슬림 행 · 최다복습)를 `enabled: isAuthEnabled()`로 게이팅한다.
 * 분기: AUTH OFF → 휴면 EmptyState(Supabase 호출 0) · 로딩 → StatsSkeleton ·
 *       데이터 0 → CTA EmptyState · 그 외 → StatsContent. 집계는 전부 클라이언트 순수 함수.
 * 기준 날짜 today는 마운트 1회 고정(useMemo) — 렌더마다 스트릭/윈도우가 흔들리지 않게.
 */
export function StatsScreen() {
  const authEnabled = isAuthEnabled();
  const openEditor = useSessionEditorStore((s) => s.open);
  // 기준 날짜 — 마운트 1회 고정(렌더마다 스트릭/윈도우가 흔들리지 않게). 브라우저 로컬 tz 기준
  // (trained_on은 KST 날짜; KST 사용자 가정 — 비-KST 보정은 후속 과제).
  const today = useMemo(() => dayjs().format(DATE_FMT), []);

  const sessionsQuery = useQuery({
    queryKey: ['stats', 'sessions'],
    queryFn: fetchAllSessionStatRows,
    enabled: authEnabled,
  });
  const techniquesQuery = useQuery({
    queryKey: ['stats', 'techniques'],
    queryFn: () => fetchTopTechniques(10),
    enabled: authEnabled,
  });

  // 집계는 데이터/날짜가 바뀔 때만 — 렌더마다 재계산/신규 배열 방지(하위 트리 안정).
  const rows = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const stats = useMemo(() => (rows.length > 0 ? computeTrainingStats(rows, today) : null), [rows, today]);
  const dots = useMemo(() => streakDays(rows, today, 14), [rows, today]);

  function renderBody() {
    if (!authEnabled) {
      return (
        <EmptyState
          title="훈련을 기록하고 통계를 확인하세요"
          description="로그인 후 매트 타임·스트릭·종목 분포가 여기에 집계됩니다."
        />
      );
    }
    if (sessionsQuery.isPending || techniquesQuery.isPending) {
      return (
        <div aria-busy="true" aria-label="통계 로딩 중">
          <StatsSkeleton />
        </div>
      );
    }
    // 페치 실패는 '빈 기록' CTA로 위장하지 않는다 — 명시적 에러 + 재시도(전역 토스트와 별개로 본문에도).
    if (sessionsQuery.isError || techniquesQuery.isError) {
      return (
        <EmptyState
          title="통계를 불러오지 못했어요"
          description="네트워크 상태를 확인하고 다시 시도해 주세요."
          action={
            <Button
              onClick={() => {
                void sessionsQuery.refetch();
                void techniquesQuery.refetch();
              }}
            >
              재시도
            </Button>
          }
        />
      );
    }
    if (!stats) {
      return (
        <EmptyState
          title="아직 기록이 없어요"
          description="세션을 기록하면 매트 타임·스트릭·종목 분포 통계가 여기에 쌓여요."
          action={<Button onClick={() => openEditor({ mode: 'create' })}>첫 세션 기록하기</Button>}
        />
      );
    }
    return <StatsContent stats={stats} streakDays={dots} topTechniques={techniquesQuery.data ?? []} />;
  }

  return (
    <section aria-labelledby="stats-heading" className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1
          id="stats-heading"
          className="flex items-center gap-2 text-heading-l text-[var(--text-strong)]"
        >
          <StatsIcon width={22} height={22} className="text-[var(--text-muted)]" />
          통계
        </h1>
        {authEnabled && stats && (
          <p className="mt-1 text-body-s-400 tabular-nums text-[var(--text-muted)]">
            총 {stats.sessionCount}개 세션 · 전체 기간 기준
          </p>
        )}
      </header>
      {renderBody()}
    </section>
  );
}
