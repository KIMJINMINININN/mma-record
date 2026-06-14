import Link from 'next/link';
import type { Metadata } from 'next';

import { JoinView } from './join-view';
import { buildJoinOgText, fetchGymPreviewForOg } from './join-og';

/**
 * 체육관 초대 페이지 `/join/[code]` (체육관=선택 모델 / 0027~0032 · 초대 퍼널 ②).
 *
 * 관장이 공유한 초대 링크의 착지 화면. **(app) 그룹 밖**이라 인증 가드가 없어 로그인 없이 열린다
 * (미리보기 RPC get_gym_by_invite_code 는 anon grant — 0028). 본문/가입 동선은 클라 아일랜드(JoinView)가
 * 브라우저 Supabase로 직접 처리한다(/share 관용구).
 *   · 미로그인        → `/login?next=/join/<code>` 로 보내 로그인 후 이 화면으로 복귀.
 *   · 로그인 + 미소속 → "가입 요청"(승인제 request_join_gym).
 *   · 로그인 + 소속   → 이미 소속 안내.
 *
 * OG 미리보기(카톡 등 크롤러는 JS 미실행)는 서버에서 체육관명을 읽어 채팅에 노출(join-og). 초대 코드
 * URL이 검색에 노출되지 않도록 robots noindex(/share 정책과 동일).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const { title, description } = buildJoinOgText(await fetchGymPreviewForOg(code));

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'website', siteName: 'MatLog' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return (
    <main className="min-h-dvh bg-[var(--surface-app)] px-4 py-6">
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-heading-xs text-[var(--text-strong)] outline-none focus-visible:shadow-[var(--ring-focus)]"
          >
            MatLog
          </Link>
        </header>

        <JoinView code={code} />
      </div>
    </main>
  );
}
