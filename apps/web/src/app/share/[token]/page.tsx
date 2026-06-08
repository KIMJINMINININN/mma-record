import Link from 'next/link';
import type { Metadata } from 'next';

import { ShareView } from './share-view';

/**
 * 공유 공개 페이지 `/share/[token]` (F11 / 0022_shares.sql · 0024_share_technique.sql).
 * 세션·기술 어느 쪽이든 받아 렌더한다(봉투 RPC get_shared_resource → ShareView 가 type 으로 분기).
 *
 * **(app) 그룹 밖**이라 (app)/layout의 인증 가드(getUser 리다이렉트)가 없다 → 로그인 없이 열린다.
 * 익명 노출 페이지라 검색 인덱싱은 막는다(robots noindex). params는 Next 16에서 Promise이므로 await.
 *
 * 데이터 페치(RPC)는 클라이언트 아일랜드(ShareView)가 브라우저 Supabase로 직접 수행한다 — 서버에서
 * 익명 RPC를 부르면 쿠키 세션이 끼어들 수 있고, 공유 뷰는 상호작용(YoutubeFacade/MarkdownView)이라
 * 어차피 클라가 필요하다. 이 page는 브랜드 헤더 + CTA를 두른 얇은 셸.
 */

export const metadata: Metadata = {
  title: '공유 · MatLog',
  // 익명 공개 링크 — 토큰 URL이 검색에 노출되지 않도록 인덱싱 차단.
  robots: { index: false, follow: false },
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="min-h-dvh bg-[var(--surface-app)] px-4 py-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        {/* 브랜드 헤더 + 기록 유도 CTA. */}
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-heading-xs text-[var(--text-strong)] outline-none focus-visible:shadow-[var(--ring-focus)]"
          >
            MatLog
          </Link>
          <Link
            href="/"
            className="text-body-s-500 text-[var(--primary)] underline underline-offset-2 outline-none focus-visible:shadow-[var(--ring-focus)]"
          >
            나도 훈련 기록하기 →
          </Link>
        </header>

        <ShareView token={token} />
      </div>
    </main>
  );
}
