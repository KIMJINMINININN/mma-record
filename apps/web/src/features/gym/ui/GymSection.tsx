'use client';

import { useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button, Input } from '@/shared/ui';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import {
  fetchMyGym,
  GYM_QUERY_KEY,
  GYM_NAME_MAX,
  gymNameSchema,
  type GymMember,
} from '@/entities/gym';

/**
 * features/gym — 프로필 탭의 "내 체육관" 섹션(클라이언트 섬).
 * 미소속: 생성 폼 + 초대코드 가입. 소속: 명단 + (관장)초대코드·강퇴·삭제 / (관원)탈퇴.
 * 모든 변경은 브라우저 supabase.rpc 직접 호출(0027 security-definer) + ['gym'] 무효화.
 * SSoT: docs/issue/20260610/gym-team-spaces-plan.md
 */

const ROLE_LABEL: Record<GymMember['role'], string> = {
  owner: '관장',
  coach: '코치',
  member: '관원',
};

const CARD = 'mb-5 rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4';

export function GymSection() {
  const authed = isAuthEnabled();
  const qc = useQueryClient();
  const { data: gym, isLoading } = useQuery({
    queryKey: GYM_QUERY_KEY,
    queryFn: fetchMyGym,
    enabled: authed,
  });

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [pending, startTransition] = useTransition();

  const sb = () => createSupabaseBrowserClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['gym'] });

  /** 공통 mutation 실행 — 에러 토스트 / 성공 토스트 + after + 무효화.
   *  fn은 supabase.rpc(...)(PostgrestFilterBuilder=thenable)도 받도록 PromiseLike로 둔다. */
  const run = (
    fn: () => PromiseLike<{ error: { message: string } | null }>,
    okMessage: string,
    after?: () => void,
  ) =>
    startTransition(async () => {
      const { error } = await fn();
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(okMessage);
      after?.();
      invalidate();
    });

  const onCreate = () => {
    const parsed = gymNameSchema.safeParse(name);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? '체육관 이름을 확인해 주세요');
      return;
    }
    run(() => sb().rpc('create_gym', { p_name: parsed.data }), '체육관을 만들었어요', () =>
      setName(''),
    );
  };

  const onJoin = () => {
    const c = code.trim().toUpperCase();
    if (!c) {
      toast.error('초대코드를 입력해 주세요');
      return;
    }
    run(() => sb().rpc('join_gym', { p_invite_code: c }), '체육관에 가입했어요', () => setCode(''));
  };

  const onCopyCode = async () => {
    if (!gym?.invite_code) return;
    try {
      await navigator.clipboard.writeText(gym.invite_code);
      toast.success('초대코드를 복사했어요');
    } catch {
      toast.error('복사에 실패했어요');
    }
  };

  const onRotate = () => {
    if (!window.confirm('초대코드를 새로 발급할까요? 기존 코드는 더 이상 쓸 수 없어요.')) return;
    run(() => sb().rpc('rotate_gym_invite_code'), '새 초대코드를 발급했어요');
  };

  const onKick = (m: GymMember) => {
    if (!m.user_id) return; // user_id는 관장 시점에만 채워짐(0028 M4) — 강퇴는 관장만이라 항상 존재
    if (!window.confirm(`${m.name} 관원을 내보낼까요?`)) return;
    run(() => sb().rpc('remove_gym_member', { p_user_id: m.user_id! }), '관원을 내보냈어요');
  };

  const onLeave = () => {
    if (!window.confirm('이 체육관에서 탈퇴할까요?')) return;
    run(() => sb().rpc('leave_gym'), '체육관에서 탈퇴했어요');
  };

  const onDelete = () => {
    if (!window.confirm('체육관을 삭제할까요? 모든 관원이 함께 해제됩니다. 되돌릴 수 없어요.')) return;
    run(() => sb().rpc('delete_gym'), '체육관을 삭제했어요');
  };

  return (
    <div className={CARD}>
      <h2 className="mb-1 text-button-m text-[var(--text-strong)]">내 체육관</h2>

      {!authed ? (
        <p className="text-body-s-400 text-[var(--text-muted)]">
          로그인 연결 후 사용할 수 있어요.
        </p>
      ) : isLoading ? (
        <p className="text-body-s-400 text-[var(--text-muted)]">불러오는 중…</p>
      ) : !gym ? (
        // ── 미소속: 생성 + 가입 ──────────────────────────────
        <div>
          <p className="mb-4 text-body-xs-400 text-[var(--text-muted)]">
            체육관을 만들어 관원을 초대하거나, 초대코드로 가입하세요.
          </p>

          <div className="mb-4">
            <Input
              label="새 체육관 만들기"
              placeholder="체육관 이름"
              value={name}
              maxLength={GYM_NAME_MAX}
              disabled={pending}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              className="mt-2"
              block
              disabled={pending || name.trim().length === 0}
              onClick={onCreate}
            >
              체육관 만들기
            </Button>
          </div>

          <div className="my-3 flex items-center gap-2 text-body-xs-400 text-[var(--text-muted)]">
            <span className="h-px flex-1 bg-[var(--border-subtle)]" />
            또는
            <span className="h-px flex-1 bg-[var(--border-subtle)]" />
          </div>

          <div>
            <Input
              label="초대코드로 가입"
              placeholder="예: A3F9C2D1"
              value={code}
              disabled={pending}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <Button
              className="mt-2"
              variant="secondary"
              block
              disabled={pending || code.trim().length === 0}
              onClick={onJoin}
            >
              가입하기
            </Button>
          </div>
        </div>
      ) : (
        // ── 소속: 체육관 뷰 ──────────────────────────────────
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-button-m text-[var(--text-strong)]">{gym.name}</p>
            <span className="shrink-0 rounded-xxs bg-[var(--surface-sunken)] px-2 py-0.5 text-body-xs-400 text-[var(--text-muted)]">
              {gym.is_owner ? '관장' : '관원'}
            </span>
          </div>

          {gym.is_owner && gym.invite_code ? (
            <div className="mb-3 rounded-m border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3">
              <p className="mb-1 text-body-xs-400 text-[var(--text-muted)]">초대코드</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-button-m tracking-widest text-[var(--text-strong)]">
                  {gym.invite_code}
                </code>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" disabled={pending} onClick={onCopyCode}>
                    복사
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={onRotate}>
                    재발급
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <p className="mb-1.5 text-body-xs-400 text-[var(--text-muted)]">
            관원 {gym.members.length}명
          </p>
          <ul className="mb-3 divide-y divide-[var(--border-subtle)]">
            {gym.members.map((m, i) => (
              <li key={m.user_id ?? `m-${i}`} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0 truncate text-body-s-400 text-[var(--text-strong)]">
                  {m.name}
                  {m.is_me ? ' (나)' : ''}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-body-xs-400 text-[var(--text-muted)]">
                    {ROLE_LABEL[m.role]}
                  </span>
                  {gym.is_owner && !m.is_me ? (
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => onKick(m)}>
                      내보내기
                    </Button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex justify-end">
            {gym.is_owner ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                className="text-[var(--primary)]"
                onClick={onDelete}
              >
                체육관 삭제
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                className="text-[var(--primary)]"
                onClick={onLeave}
              >
                탈퇴
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
