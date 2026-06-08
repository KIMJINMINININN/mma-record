'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import dayjs from 'dayjs';

import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import { HIT_AREA_44, Skeleton } from '@/shared/ui';

/**
 * ShareComments — 공유 페이지(`/share/[token]`)의 코멘트 섹션 (F11 후속 · 0025_comments.sql).
 *
 * 공유 자원(세션 OR 기술)에 코멘트를 단다 — share 에 붙으므로 자원 타입과 무관하게 동작한다.
 * **읽기=누구나(익명 포함), 쓰기=로그인 유저, 삭제=작성자 OR 공유 소유자**. 모든 접근은 security-definer
 * RPC(get_shared_comments / add_shared_comment / delete_shared_comment) 경유 — 테이블은 직접 노출 안 됨.
 *
 * (app) 그룹 밖이라 서버 인증 가드가 없지만, 브라우저 Supabase 클라이언트가 세션 쿠키를 읽으므로
 * auth.getUser()로 로그인 여부(viewerId)를 알아낸다(null=익명). 서버 액션 없이 ShareButton 처럼 순수
 * 클라 아일랜드로 rpc 를 직접 부르고, 성공 시 코멘트 쿼리를 invalidate 한다.
 *
 * 코멘트 본문은 임의의 로그인 유저 입력이라 **평문**으로만 렌더한다(MarkdownView 미사용 —
 * 주입/악용 표면 제거). 줄바꿈만 살리려 whitespace-pre-wrap break-words.
 */

/** RPC가 돌려주는 코멘트 jsonb 형태(읽기 전용). get_shared_comments / add_shared_comment 항목과 1:1. */
interface Comment {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
  can_delete: boolean;
}

/** 코멘트 목록 쿼리 — 토큰별 캐시. 토큰 무효/코멘트 없음이면 빈 배열(누설 없음). */
function useComments(token: string) {
  return useQuery<Comment[]>({
    queryKey: ['share', 'comments', token],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('get_shared_comments', { p_token: token });
      if (error) throw new Error(error.message);
      return (data as Comment[] | null) ?? [];
    },
    retry: false,
    staleTime: 30_000,
  });
}

/** 뷰어 로그인 여부 — 세션 쿠키 기반 user.id(없으면 null=익명). 쓰기/삭제 UI 분기에 쓴다. */
function useViewerId() {
  return useQuery<string | null>({
    queryKey: ['share', 'viewer'],
    queryFn: async () => {
      const { data } = await createSupabaseBrowserClient().auth.getUser();
      return data.user?.id ?? null;
    },
    retry: false,
    staleTime: Infinity,
  });
}

export function ShareComments({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const { data: comments } = useComments(token);
  const { data: viewerId, isLoading: viewerLoading } = useViewerId();

  const [body, setBody] = useState('');
  const [submitting, startSubmit] = useTransition();
  const [deletingId, startDelete] = useTransition();

  const items = comments ?? [];

  const onSubmit = () => {
    const trimmed = body.trim();
    if (trimmed === '') return;
    startSubmit(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.rpc('add_shared_comment', { p_token: token, p_body: trimmed });
      if (error) {
        toast.error('코멘트를 남기지 못했어요');
        return;
      }
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['share', 'comments', token] });
      toast.success('코멘트를 남겼어요');
    });
  };

  const onDelete = (id: string) => {
    startDelete(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.rpc('delete_shared_comment', { p_comment_id: id });
      if (error) {
        toast.error('코멘트를 삭제하지 못했어요');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['share', 'comments', token] });
    });
  };

  return (
    <section
      aria-label="코멘트"
      className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)]"
    >
      {/* 헤딩 + 개수 */}
      <h2 className="text-heading-xs text-[var(--text-strong)]">
        코멘트 <span className="tabular-nums text-[var(--text-muted)]">{items.length}</span>
      </h2>

      {/* 목록 — 작성자 · 날짜 · 본문(평문). 권한 있으면 × 삭제 버튼. */}
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
                    disabled={deletingId}
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
              {/* 본문 평문 — 줄바꿈만 보존, 마크다운/HTML 렌더 안 함(주입 표면 제거). */}
              <p className="whitespace-pre-wrap break-words text-body-s-400 text-[var(--text-default)]">
                {c.body}
              </p>
            </li>
          ))
        ) : (
          <li className="text-body-s-400 text-[var(--text-muted)]">아직 코멘트가 없어요</li>
        )}
      </ul>

      {/* 작성 영역 — 로그인=textarea+등록 / 익명=로그인 유도 링크. 뷰어 로딩 중엔 얇은 스켈레톤. */}
      <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
        {viewerLoading ? (
          <Skeleton className="h-20 w-full rounded-s" />
        ) : viewerId ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="share-comment-body" className="text-button-xs text-[var(--text-muted)]">
              코멘트 남기기
            </label>
            <textarea
              id="share-comment-body"
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
        ) : (
          <p className="text-body-s-400 text-[var(--text-muted)]">
            코멘트를 남기려면 로그인이 필요해요.{' '}
            <Link
              href="/login"
              className="text-[var(--primary)] underline underline-offset-2 outline-none focus-visible:shadow-[var(--ring-focus)]"
            >
              로그인하고 코멘트 남기기
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
