'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { fetchMyGym, getMyPendingRequest } from '@/entities/gym';
import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { Button, Input } from '@/shared/ui';

/**
 * GymOnboardingCard — 캘린더 첫 진입 온보딩 안내 (체육관=선택 모델 / 0027~0032).
 *
 * "로그인 후 어디 소속인지 확인 → 미소속이면 안내" 흐름. **캘린더를 막지 않는다**(1인 일지 유지) —
 * 미소속자에게 참여/생성 경로만 띄우고, "나중에"로 닫으면 이 브라우저에선 다시 안 뜬다(혼자 쓰기 보장).
 *   · 소속됨        → 렌더 안 함(null). 관리는 프로필 GymSection.
 *   · 가입 승인 대기 → "승인 대기 중" + 취소.
 *   · 미소속        → 초대코드 참여 / 체육관 만들기 / 나중에(dismiss).
 *
 * 데이터/변경은 GymSection 관용구(브라우저 supabase.rpc 직접 + ['gym'] 무효화). 닫음 상태는
 * localStorage(기기별, 가벼움 — 미소속이어도 한 번 닫으면 권유 안 함; 참여/생성하면 소속되어 자동 사라짐).
 */

const DISMISS_KEY = 'matlog.gym-onboarding-dismissed';

// 닫음 상태를 localStorage 외부 스토어로 다룬다(useSyncExternalStore — hydration-safe + effect 내 setState 회피).
// 같은 탭에서 setItem은 storage 이벤트를 안 쏘므로, dismiss 시 모듈 리스너로 직접 리렌더를 알린다.
const dismissListeners = new Set<() => void>();
function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}
function subscribeDismissed(cb: () => void): () => void {
  dismissListeners.add(cb);
  return () => dismissListeners.delete(cb);
}
function commitDismiss(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // localStorage 비가용 — 리스너 통지로 이번 세션엔 닫힌 상태 유지(다음 마운트엔 다시 보일 수 있음).
  }
  dismissListeners.forEach((l) => l());
}

export function GymOnboardingCard() {
  const authed = isAuthEnabled();
  const qc = useQueryClient();

  // 서버 스냅샷=true(닫힘) → SSR엔 안 보이고 hydration 후 실제 값 반영(미소속이면 노출).
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => true);

  const { data: gym, isLoading } = useQuery({
    queryKey: ['gym', 'my'],
    queryFn: fetchMyGym,
    enabled: authed,
  });
  const { data: pending } = useQuery({
    queryKey: ['gym', 'pending-request'],
    queryFn: getMyPendingRequest,
    enabled: authed && !isLoading && !gym,
  });

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, startTransition] = useTransition();
  const sb = () => createSupabaseBrowserClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['gym'] });

  const run = (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) =>
    startTransition(async () => {
      const { error } = await fn();
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(ok);
      invalidate();
    });

  function dismiss() {
    commitDismiss();
  }

  // 안 띄우는 경우: 인증 OFF · 로딩 · 이미 소속 · 닫음(대기 중이면 닫았어도 보여줌).
  if (!authed || isLoading || gym) return null;
  if (dismissed && !pending) return null;

  // 가입 승인 대기 중 — 닫기 없이 상태만 안내(+취소).
  if (pending) {
    return (
      <section className="mb-4 rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4">
        <p className="text-body-m-500 text-[var(--text-strong)]">
          <span aria-hidden="true">🏠 </span>
          체육관 가입 요청 — 승인 대기 중
        </p>
        <p className="mt-1 text-body-s-400 text-[var(--text-muted)]">
          관장님이 승인하면 체육관 피드와 공유가 열립니다.
        </p>
        <div className="mt-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => run(() => sb().rpc('cancel_join_request'), '요청을 취소했어요.')}
          >
            요청 취소
          </Button>
        </div>
      </section>
    );
  }

  // 미소속 — 참여 / 생성 / 나중에.
  return (
    <section className="relative mb-4 rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4">
      <button
        type="button"
        aria-label="안내 닫기"
        onClick={dismiss}
        className="absolute right-3 top-3 text-body-s-400 text-[var(--text-muted)] outline-none pointer-hover:text-[var(--text-default)] focus-visible:shadow-[var(--ring-focus)]"
      >
        나중에
      </button>

      <p className="text-body-m-500 text-[var(--text-strong)]">
        <span aria-hidden="true">🥋 </span>
        체육관과 함께 쓰면 더 좋아요
      </p>
      <p className="mt-1 text-body-s-400 text-[var(--text-muted)]">
        코치에게 피드백을 받고 기록을 공유할 수 있어요. 혼자 기록하셔도 캘린더는 그대로 사용할 수 있습니다.
      </p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* 초대받은 사람: 초대코드로 참여(승인제) */}
        <div className="flex min-w-0 flex-1 items-end gap-2">
          <Input
            label="초대코드로 참여"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="초대코드 입력"
            wrapperClassName="min-w-0 flex-1"
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || code.trim() === ''}
            onClick={() =>
              run(
                () => sb().rpc('request_join_gym', { p_invite_code: code.trim() }),
                '가입을 요청했어요. 관장님 승인을 기다려 주세요.',
              )
            }
          >
            참여
          </Button>
        </div>

        {/* 관장: 체육관 만들기 */}
        <div className="flex min-w-0 flex-1 items-end gap-2">
          <Input
            label="또는 체육관 만들기"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="체육관 이름"
            wrapperClassName="min-w-0 flex-1"
          />
          <Button
            variant="primary"
            size="sm"
            disabled={busy || name.trim() === ''}
            onClick={() => run(() => sb().rpc('create_gym', { p_name: name.trim() }), '체육관을 만들었어요!')}
          >
            만들기
          </Button>
        </div>
      </div>
    </section>
  );
}
