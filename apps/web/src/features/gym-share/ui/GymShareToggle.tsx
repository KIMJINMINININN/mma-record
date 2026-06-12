'use client';

import { useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/shared/ui';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import {
  fetchMyGym,
  GYM_QUERY_KEY,
  GYM_SHARE_VISIBILITIES,
  GYM_SHARE_VISIBILITY_LABEL,
  type GymShareVisibility,
} from '@/entities/gym';
import {
  listMyGymShares,
  gymSharesKey,
  GYM_FEED_KEY,
  type GymShareResourceType,
} from '@/entities/gym-share';

/**
 * features/gym-share — "체육관에 공유" 토글 + 범위 선택(세션 카드 / 기술 상세에 배치).
 * 체육관 소속자에게만. 본인 기록을 범위(누가 볼지)와 함께 공유(0038 share_to_gym).
 *   · 미공유 → [🏠 체육관에 공유] → 펼쳐 범위 선택(specific이면 멤버 선택) → 공유.
 *   · 공유중 → [🏠 공유중] → 해제. (범위 변경은 해제 후 재공유 — MVP)
 *   · 미소속 → null.
 */
export function GymShareToggle({
  resourceType,
  resourceId,
}: {
  resourceType: GymShareResourceType;
  resourceId: string;
}) {
  const authed = isAuthEnabled();
  const qc = useQueryClient();

  const { data: gym } = useQuery({ queryKey: GYM_QUERY_KEY, queryFn: fetchMyGym, enabled: authed });
  const { data: shared = [] } = useQuery({
    queryKey: gymSharesKey(resourceType),
    queryFn: () => listMyGymShares(resourceType),
    enabled: authed && !!gym,
  });

  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<GymShareVisibility>('coaches');
  const [recipients, setRecipients] = useState<Set<string>>(new Set());

  // 미소속 → 토글 미노출(체육관 기능은 소속자 전용).
  if (!authed || !gym) return null;

  const isShared = shared.includes(resourceId);
  // specific 공유 대상 후보 = 나를 뺀 체육관 멤버(user_id 있는 것만 — 타입 좁힘).
  const others = gym.members.filter(
    (m): m is typeof m & { user_id: string } => !m.is_me && m.user_id != null,
  );
  // specific인데 아무도 안 고르면 공유 의미 없음 → 비활성.
  const canSubmit = visibility !== 'specific' || recipients.size > 0;

  function toggleRecipient(userId: string) {
    setRecipients((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function resetForm() {
    setOpen(false);
    setVisibility('coaches');
    setRecipients(new Set());
  }

  const onShare = () =>
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.rpc('share_to_gym', {
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_visibility: visibility,
        p_recipient_ids: visibility === 'specific' ? Array.from(recipients) : undefined,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`체육관에 공유했어요 · ${GYM_SHARE_VISIBILITY_LABEL[visibility]}`);
      resetForm();
      qc.invalidateQueries({ queryKey: gymSharesKey(resourceType) });
      qc.invalidateQueries({ queryKey: GYM_FEED_KEY });
    });

  const onUnshare = () =>
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.rpc('unshare_from_gym', {
        p_resource_type: resourceType,
        p_resource_id: resourceId,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('체육관 공유를 해제했어요');
      qc.invalidateQueries({ queryKey: gymSharesKey(resourceType) });
      qc.invalidateQueries({ queryKey: GYM_FEED_KEY });
    });

  // 공유중 — 해제만(범위 변경은 해제 후 재공유).
  if (isShared) {
    return (
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        aria-pressed={true}
        title="체육관 공유 해제"
        onClick={onUnshare}
      >
        🏠 공유중
      </Button>
    );
  }

  // 미공유 + 닫힘 — 펼치기 버튼.
  if (!open) {
    return (
      <Button size="sm" variant="ghost" title="체육관에 공유" onClick={() => setOpen(true)}>
        🏠 체육관에 공유
      </Button>
    );
  }

  // 미공유 + 열림 — 범위 선택 패널.
  return (
    <div className="flex flex-col gap-2 rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] p-3">
      <p className="text-body-xs-500 text-[var(--text-default)]">누구에게 공유할까요?</p>

      {/* 범위 라디오 칩 */}
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="공유 범위">
        {GYM_SHARE_VISIBILITIES.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={visibility === v}
            onClick={() => setVisibility(v)}
            className={[
              'rounded-xs px-2.5 py-1 text-body-xs-500 outline-none transition-colors',
              'focus-visible:shadow-[var(--ring-focus)]',
              visibility === v
                ? 'bg-[var(--primary)] text-[var(--text-on-primary)]'
                : 'bg-[var(--surface-sunken)] text-[var(--text-default)] pointer-hover:bg-[var(--surface-raised)]',
            ].join(' ')}
          >
            {GYM_SHARE_VISIBILITY_LABEL[v]}
          </button>
        ))}
      </div>

      {/* specific — 멤버 체크박스 */}
      {visibility === 'specific' && (
        <div className="flex flex-col gap-1 border-t border-[var(--border-subtle)] pt-2">
          {others.length === 0 ? (
            <p className="text-body-xs-400 text-[var(--text-muted)]">아직 다른 멤버가 없어요.</p>
          ) : (
            others.map((m) => (
              <label
                key={m.user_id}
                className="flex items-center gap-2 text-body-s-400 text-[var(--text-default)]"
              >
                <input
                  type="checkbox"
                  checked={recipients.has(m.user_id)}
                  onChange={() => toggleRecipient(m.user_id)}
                  className="accent-[var(--primary)]"
                />
                <span>
                  {m.name}
                  {m.role !== 'member' ? (
                    <span className="ml-1 text-body-xs-400 text-[var(--text-muted)]">
                      ({m.role === 'owner' ? '관장' : '코치'})
                    </span>
                  ) : null}
                </span>
              </label>
            ))
          )}
        </div>
      )}

      <div className="mt-1 flex gap-2">
        <Button size="sm" variant="primary" disabled={pending || !canSubmit} onClick={onShare}>
          공유하기
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={resetForm}>
          취소
        </Button>
      </div>
    </div>
  );
}
