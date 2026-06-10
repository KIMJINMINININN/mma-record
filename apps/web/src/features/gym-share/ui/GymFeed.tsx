'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '@/shared/ui';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { fetchMyGym, GYM_QUERY_KEY } from '@/entities/gym';
import { getGymFeed, GYM_FEED_KEY, type GymFeedItem } from '@/entities/gym-share';

/**
 * features/gym-share — 체육관 피드(/gym/feed). 2a: 요약 목록.
 * 관장=체육관 전체 공유 / 관원=본인 공유(서버 get_gym_feed가 분기). 상세·코멘트는 2b/2c.
 */

const TYPE_LABEL: Record<GymFeedItem['resource_type'], string> = {
  session: '세션',
  technique: '기술',
};

const CARD = 'rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4';

export function GymFeed() {
  const authed = isAuthEnabled();
  const { data: gym, isLoading: gymLoading } = useQuery({
    queryKey: GYM_QUERY_KEY,
    queryFn: fetchMyGym,
    enabled: authed,
  });
  const { data: feed = [], isLoading: feedLoading } = useQuery({
    queryKey: GYM_FEED_KEY,
    queryFn: getGymFeed,
    enabled: authed && !!gym,
  });

  if (!authed) {
    return (
      <p className="text-body-s-400 text-[var(--text-muted)]">로그인 연결 후 사용할 수 있어요.</p>
    );
  }
  if (gymLoading) {
    return <p className="text-body-s-400 text-[var(--text-muted)]">불러오는 중…</p>;
  }
  if (!gym) {
    return (
      <EmptyState
        title="체육관이 없어요"
        description="프로필에서 체육관을 만들거나 초대코드로 가입하세요."
      />
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-heading-l text-[var(--text-strong)]">{gym.name} · 피드</h1>
        <p className="mt-1 text-body-s-400 text-[var(--text-muted)]">
          {gym.is_staff ? '관원들이 체육관에 공유한 기록이에요.' : '내가 체육관에 공유한 기록이에요.'}
        </p>
      </div>

      {feedLoading ? (
        <p className="text-body-s-400 text-[var(--text-muted)]">불러오는 중…</p>
      ) : feed.length === 0 ? (
        <EmptyState
          title="아직 공유된 기록이 없어요"
          description={
            gym.is_staff
              ? '관원이 세션·기술을 체육관에 공유하면 여기에 표시돼요.'
              : '세션·기술 카드의 “🏠 체육관” 버튼으로 공유해 보세요.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {feed.map((item) => (
            <li key={item.id}>
              <Link
                href={`/gym/feed/${item.id}`}
                className={`block ${CARD} outline-none transition-colors pointer-hover:bg-[var(--surface-sunken)] focus-visible:shadow-[var(--ring-focus)]`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-button-m text-[var(--text-strong)]">
                    {item.title}
                    {item.missing ? ' · 삭제된 기록' : ''}
                  </span>
                  <span className="shrink-0 rounded-xxs bg-[var(--surface-sunken)] px-2 py-0.5 text-body-xs-400 text-[var(--text-muted)]">
                    {TYPE_LABEL[item.resource_type]}
                  </span>
                </div>
                <p className="mt-1 text-body-xs-400 text-[var(--text-muted)]">
                  {gym.is_owner ? `${item.member_name}` : '나'}
                  {item.subtitle ? ` · ${item.subtitle}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
