'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';

import { HIT_AREA_44 } from '@/shared/ui';

import { createShare } from '../api/share-actions';

/**
 * SessionShareButton — 세션 카드의 '공유' 진입점 클라 아일랜드 (F11 / 0022_shares.sql).
 *
 * SessionCard는 서버 컴포넌트라 클립보드/토스트(클라)를 못 쓴다 → SessionFavoriteStar와 동일하게
 * **feature 안**에 작은 클라 아일랜드로 두고, 서버 액션(createShare)을 **직접** import 한다
 * (배럴로 재노출하면 위젯/서버 그래프에 server-only가 누수돼 테스트가 깨진다 — session-favorite 관용구).
 * 클릭 시 createShare('session', id)로 공유 토큰을 만들거나 재사용(멱등)하고, 성공하면
 * `${origin}/share/${token}` 절대 URL을 클립보드에 복사한 뒤 토스트로 알린다. 도먼시(인프라 OFF)면
 * info, 그 외 실패는 error 토스트. 연타 방지로 useTransition pending 동안 비활성화한다.
 */
export function SessionShareButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();

  const onShare = () => {
    startTransition(async () => {
      const res = await createShare('session', sessionId);
      if (res.ok) {
        const url = `${window.location.origin}/share/${res.token}`;
        try {
          await navigator.clipboard.writeText(url);
          toast.success('공유 링크가 복사됐어요');
        } catch {
          // 클립보드 권한 거부/비보안 컨텍스트 등 — 링크는 만들어졌으니 URL을 노출해 수동 복사 유도.
          toast.success('공유 링크가 생성됐어요', { description: url });
        }
      } else if (res.dormant) {
        toast.info(res.error);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onShare}
      disabled={pending}
      aria-label="세션 공유 링크 복사"
      className={`inline-flex size-7 items-center justify-center rounded-full text-[var(--text-muted)] outline-none transition-colors duration-[var(--duration-fast)] pointer-hover:text-[var(--text-default)] focus-visible:shadow-[var(--ring-focus)] disabled:opacity-50 ${HIT_AREA_44}`}
    >
      <svg
        width={15}
        height={15}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
      </svg>
    </button>
  );
}
