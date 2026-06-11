import type { Metadata } from 'next';

import { AdminOverview } from '@/features/admin-overview';

/**
 * 운영 현황 대시보드 `/admin` (0037_admin_overview.sql).
 *
 * (app) 그룹 안 → 레이아웃 인증 가드로 비로그인은 /login으로. 운영자 권한은 AdminOverview 아일랜드가
 * get_admin_overview RPC 결과로 분기(비운영자는 "권한 없음" 안내). nav에는 노출하지 않는 직접 URL 페이지.
 * 검색 인덱싱 차단(운영 전용).
 */

export const metadata: Metadata = {
  title: '운영 현황 · MatLog',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-heading-l text-[var(--text-strong)]">운영 현황</h1>
      <p className="mb-5 text-body-s-400 text-[var(--text-muted)]">
        전체 운영 지표 요약(읽기 전용) — 운영자 전용입니다.
      </p>
      <AdminOverview />
    </main>
  );
}
