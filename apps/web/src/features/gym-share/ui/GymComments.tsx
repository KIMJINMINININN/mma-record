'use client';

import { useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import dayjs from 'dayjs';

import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import { HIT_AREA_44 } from '@/shared/ui';

/**
 * GymComments — 체육관 공유 상세의 코멘트 섹션(2c · 0030 gym_comments).
 * 코치↔관원 **양방향**. 읽기/쓰기/삭제 모두 {공유 관원, 관장}만(서버 RPC가 강제).
 * 상세 라우트가 (app) 인증가드라 뷰어는 항상 로그인 상태 → 작성 폼 상시 노출.
 * 본문은 평문 렌더(주입 표면 제거 — share-comments와 동일 정책).
 */

interface GymComment {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
  can_delete: boolean;
}

const commentsKey = (gymShareId: string) => ['gym', 'comments', gymShareId];

export function GymComments({ gymShareId }: { gymShareId: string }) {
  const queryClient = useQueryClient();
  const { data: comments } = useQuery<GymComment[]>({
    queryKey: commentsKey(gymShareId),
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('get_gym_comments', { p_gym_share_id: gymShareId });
      if (error) throw new Error(error.message);
      return (data as GymComment[] | null) ?? [];
    },
    retry: false,
    staleTime: 30_000,
  });

  const [body, setBody] = useState('');
  const [submitting, startSubmit] = useTransition();
  const [deleting, startDelete] = useTransition();

  const items = comments ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: commentsKey(gymShareId) });

  const onSubmit = () => {
    const trimmed = body.trim();
    if (trimmed === '') return;
    startSubmit(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.rpc('add_gym_comment', {
        p_gym_share_id: gymShareId,
        p_body: trimmed,
      });
      if (error) {
        toast.error('코멘트를 남기지 못했어요');
        return;
      }
      setBody('');
      invalidate();
      toast.success('코멘트를 남겼어요');
    });
  };

  const onDelete = (id: string) => {
    startDelete(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.rpc('delete_gym_comment', { p_comment_id: id });
      if (error) {
        toast.error('코멘트를 삭제하지 못했어요');
        return;
      }
      invalidate();
    });
  };

  return (
    <section
      aria-label="코멘트"
      className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)]"
    >
      <h2 className="text-heading-xs text-[var(--text-strong)]">
        코멘트 <span className="tabular-nums text-[var(--text-muted)]">{items.length}</span>
      </h2>

      <ul className="mt-3 flex flex-col gap-3">
        {items.length > 0 ? (
          items.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0"
            >
              <div className="flex items-baseline gap-2">
                <strong className="text-body-s-500 text-[var(--text-strong)]">{c.author_name}</strong>
                <span className="text-body-xs-400 tabular-nums text-[var(--text-disabled)]">
                  {dayjs(c.created_at).format('YYYY.MM.DD HH:mm')}
                </span>
                {c.can_delete && (
                  <button
                    type="button"
                    onClick={() => onDelete(c.id)}
                    disabled={deleting}
                    aria-label="코멘트 삭제"
                    className={`ml-auto inline-flex size-7 items-center justify-center rounded-full text-[var(--text-muted)] outline-none transition-colors duration-[var(--duration-fast)] pointer-hover:text-[var(--danger)] focus-visible:shadow-[var(--ring-focus)] disabled:opacity-50 ${HIT_AREA_44}`}
                  >
                    <svg
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words text-body-s-400 text-[var(--text-default)]">
                {c.body}
              </p>
            </li>
          ))
        ) : (
          <li className="text-body-s-400 text-[var(--text-muted)]">아직 코멘트가 없어요</li>
        )}
      </ul>

      <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4">
        <label htmlFor="gym-comment-body" className="text-button-xs text-[var(--text-muted)]">
          코멘트 남기기
        </label>
        <textarea
          id="gym-comment-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="코멘트를 입력하세요"
          className="w-full resize-y rounded-s border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-2 text-body-s-400 text-[var(--text-default)] outline-none placeholder:text-[var(--text-disabled)] focus-visible:shadow-[var(--ring-focus)]"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={body.trim() === '' || submitting}
            className="inline-flex h-9 items-center justify-center rounded-xs bg-[var(--primary)] px-4 text-button-s font-medium text-[var(--text-on-primary)] outline-none transition-colors duration-[var(--duration-fast)] pointer-hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] focus-visible:shadow-[var(--ring-focus)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '등록 중…' : '등록'}
          </button>
        </div>
      </div>
    </section>
  );
}
