'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/shared/ui';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import { fetchGymByInviteCode } from '@/entities/gym';

/**
 * features/gym — 초대 링크(/gym/join/[code]) 가입 뷰(클라이언트 섬).
 * 코드로 체육관 미리보기 → 가입 버튼 → 성공 시 /profile 이동.
 * (app) 그룹 안이라 비로그인은 layout 가드가 /login으로 보낸다.
 */

const WRAP = 'rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] p-6 text-center';

export function GymJoinView({ code }: { code: string }) {
  const router = useRouter();
  const authed = isAuthEnabled();
  const { data: preview, isLoading } = useQuery({
    queryKey: ['gym', 'preview', code],
    queryFn: () => fetchGymByInviteCode(code),
    enabled: authed,
  });
  const [pending, startTransition] = useTransition();

  const onJoin = () => {
    startTransition(async () => {
      const { error } = await createSupabaseBrowserClient().rpc('join_gym', {
        p_invite_code: code,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('체육관에 가입했어요');
      router.push('/profile');
    });
  };

  if (!authed) {
    return <div className={WRAP}><p className="text-body-s-400 text-[var(--text-muted)]">로그인 연결 후 사용할 수 있어요.</p></div>;
  }
  if (isLoading) {
    return <div className={WRAP}><p className="text-body-s-400 text-[var(--text-muted)]">불러오는 중…</p></div>;
  }
  if (!preview) {
    return (
      <div className={WRAP}>
        <p className="mb-1 text-button-m text-[var(--text-strong)]">유효하지 않은 초대코드</p>
        <p className="mb-4 text-body-s-400 text-[var(--text-muted)]">
          코드가 만료됐거나 잘못됐어요.
        </p>
        <Button variant="secondary" onClick={() => router.push('/profile')}>
          프로필로 가기
        </Button>
      </div>
    );
  }

  return (
    <div className={WRAP}>
      <p className="mb-1 text-body-xs-400 text-[var(--text-muted)]">체육관 초대</p>
      <p className="mb-1 text-heading-l text-[var(--text-strong)]">{preview.name}</p>
      <p className="mb-5 text-body-s-400 text-[var(--text-muted)]">관원 {preview.member_count}명</p>
      <div className="flex justify-center gap-2">
        <Button variant="ghost" disabled={pending} onClick={() => router.push('/profile')}>
          나중에
        </Button>
        <Button disabled={pending} onClick={onJoin}>
          가입하기
        </Button>
      </div>
    </div>
  );
}
