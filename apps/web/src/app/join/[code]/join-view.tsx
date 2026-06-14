'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { fetchGymByInviteCode, fetchMyGym, getMyPendingRequest } from '@/entities/gym';
import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import { Button, EmptyState, Skeleton } from '@/shared/ui';

/**
 * JoinView — 초대 링크 착지의 클라 아일랜드 (초대 퍼널 ②).
 *
 * 미리보기(anon)·로그인 여부·내 소속/대기 상태를 모아 한 가지 CTA로 분기한다. 가입은 승인제
 * (request_join_gym → 관장 승인) — 링크 소지자라도 바로 멤버가 되지 않는다.
 *   · 무효 코드      → 안내(존재 누설 최소화 위해 무효/만료 동일 문구).
 *   · 미로그인        → 로그인 후 이 화면 복귀(?next).
 *   · 이미 소속       → 소속 안내(1계정 1체육관이라 다른 곳 가입 불가).
 *   · 이미 요청/방금 요청 → 대기 안내.
 *   · 가입 가능       → "가입 요청".
 *
 * 일반 브라우저(앱 WebView 밖)에선 "앱에서 보기" 배너로 설치 앱을 유도(window.ReactNativeWebView 유무).
 */

/** 앱 WebView 안에서 실행 중인가 — 배너 노출 게이트(밖=브라우저일 때만 앱 유도). */
function isInApp(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!(window as { ReactNativeWebView?: unknown }).ReactNativeWebView
  );
}

export function JoinView({ code }: { code: string }) {
  const qc = useQueryClient();
  const sb = () => createSupabaseBrowserClient();
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);

  // 미리보기(체육관명+인원) — anon 호출 가능. 무효 코드면 null.
  const {
    data: preview,
    isLoading: previewLoading,
    isError,
  } = useQuery({
    queryKey: ['gym', 'preview', code],
    queryFn: () => fetchGymByInviteCode(code),
    retry: false,
    staleTime: 60_000,
  });

  // 방문자 상태 — 로그인 여부 + (로그인 시) 내 소속/대기 요청.
  const { data: viewer, isLoading: viewerLoading } = useQuery({
    queryKey: ['gym', 'join-viewer'],
    queryFn: async () => {
      const { data } = await sb().auth.getUser();
      const userId = data.user?.id ?? null;
      if (!userId) return { userId: null, gym: null, pending: null } as const;
      const [gym, pending] = await Promise.all([fetchMyGym(), getMyPendingRequest()]);
      return { userId, gym, pending } as const;
    },
    retry: false,
  });

  if (previewLoading || viewerLoading) return <JoinSkeleton />;

  // 무효/만료 코드 — 존재 누설 최소화 위해 단일 문구.
  if (isError || !preview) {
    return (
      <EmptyState
        title="유효하지 않은 초대 링크예요"
        description="링크가 잘못되었거나, 관장이 초대코드를 새로 발급했을 수 있어요."
      />
    );
  }

  const loginHref = `/login?next=${encodeURIComponent(`/join/${code}`)}`;

  async function onJoin() {
    setBusy(true);
    const { error } = await sb().rpc('request_join_gym', { p_invite_code: code });
    setBusy(false);
    qc.invalidateQueries({ queryKey: ['gym'] });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('가입을 요청했어요. 관장님 승인을 기다려 주세요.');
    setRequested(true);
  }

  return (
    <>
      {!isInApp() ? (
        <a
          href={`rnappdev://join/${code}`}
          className="flex items-center justify-between gap-3 rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 py-3 outline-none focus-visible:shadow-[var(--ring-focus)]"
        >
          <span className="text-body-s-400 text-[var(--text-default)]">
            <span aria-hidden="true">📱 </span>
            MatLog 앱에서 더 편하게 이용하세요
          </span>
          <span className="shrink-0 text-button-s text-[var(--primary)]">앱에서 보기</span>
        </a>
      ) : null}

      <section className="rounded-l border border-[var(--border-subtle)] bg-[var(--surface-base)] p-6 text-center shadow-[var(--shadow-card)]">
        <p className="text-body-s-400 text-[var(--text-muted)]">
          <span aria-hidden="true">🥋 </span>
          체육관 초대
        </p>
        <h1 className="mt-1 text-heading-m text-[var(--text-strong)]">{preview.name}</h1>
        <p className="mt-1 text-body-s-400 text-[var(--text-muted)]">
          멤버 {preview.member_count}명
        </p>

        <div className="mt-6">
          {!viewer?.userId ? (
            // 미로그인 — 로그인 후 이 화면 복귀.
            <Link
              href={loginHref}
              className="inline-flex h-10 w-full items-center justify-center rounded-xs bg-[var(--primary)] px-3.5 text-button-m font-medium text-[var(--text-on-primary)] outline-none pointer-hover:bg-[var(--primary-hover)] focus-visible:shadow-[var(--ring-focus)]"
            >
              로그인하고 참여하기
            </Link>
          ) : viewer.gym ? (
            // 이미 소속(1계정 1체육관) — 가입 불가.
            <div className="flex flex-col gap-3">
              <p className="text-body-s-400 text-[var(--text-muted)]">
                이미 <span className="text-[var(--text-strong)]">{viewer.gym.name}</span>에 소속되어
                있어요. 다른 체육관에 가입하려면 먼저 탈퇴해 주세요.
              </p>
              <Link
                href="/calendar"
                className="text-button-s text-[var(--primary)] underline underline-offset-2 outline-none focus-visible:shadow-[var(--ring-focus)]"
              >
                MatLog 열기 →
              </Link>
            </div>
          ) : requested || viewer.pending ? (
            // 이미 요청했거나 방금 요청함 — 승인 대기.
            <p className="text-body-s-400 text-[var(--text-muted)]">
              가입 요청을 보냈어요. 관장님이 승인하면 체육관 피드와 공유가 열립니다.
            </p>
          ) : (
            // 가입 요청 가능.
            <Button block disabled={busy} onClick={onJoin}>
              가입 요청
            </Button>
          )}
        </div>
      </section>

      <p className="text-center text-body-xs-400 text-[var(--text-muted)]">
        가입은 관장 승인 후 완료됩니다.
      </p>
    </>
  );
}

function JoinSkeleton() {
  return (
    <section className="rounded-l border border-[var(--border-subtle)] bg-[var(--surface-base)] p-6">
      <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-3 h-10 w-full" />
      </div>
    </section>
  );
}
