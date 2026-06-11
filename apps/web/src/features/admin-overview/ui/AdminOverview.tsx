'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import { isAuthEnabled } from '@/shared/api/supabase/env';

/**
 * AdminOverview — 운영 현황 대시보드 아일랜드 (/admin, 0037_admin_overview.sql).
 *
 * get_admin_overview RPC(security definer, is_app_admin 가드)로 **카운트만** 받아 카드로 보여준다.
 * 개인 데이터는 한 건도 받지 않는다. admin이 아니면 RPC가 '권한이 없습니다'로 거부 → 권한 안내 렌더.
 * GymSection 관용구: 브라우저 supabase.rpc 직접 호출 + react-query. nav에 없는 직접 URL 페이지.
 */

interface Overview {
  members_total: number;
  members_new_week: number;
  sessions_total: number;
  sessions_week: number;
  techniques_total: number;
  gyms_total: number;
  gym_members_total: number;
  shares_total: number;
  comments_total: number;
  active_devices: number;
  generated_at: string;
}

async function fetchOverview(): Promise<Overview> {
  const { data, error } = await createSupabaseBrowserClient().rpc('get_admin_overview');
  if (error) throw error;
  return data as unknown as Overview;
}

/** 카드 1장 — 큰 숫자 + 라벨 + (선택) 보조 텍스트. */
function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4">
      <span className="text-body-xs-400 text-[var(--text-muted)]">{label}</span>
      <span className="text-heading-l tabular-nums text-[var(--text-strong)]">
        {value.toLocaleString()}
      </span>
      {sub ? <span className="text-body-xs-400 text-[var(--text-muted)]">{sub}</span> : null}
    </div>
  );
}

export function AdminOverview() {
  const authed = isAuthEnabled();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: fetchOverview,
    enabled: authed,
    retry: false, // 권한 거부는 재시도 의미 없음
  });

  if (!authed) {
    return <p className="text-body-s-400 text-[var(--text-muted)]">로그인 연결 후 사용할 수 있습니다.</p>;
  }
  if (isLoading) {
    return <p className="text-body-s-400 text-[var(--text-muted)]">불러오는 중…</p>;
  }
  if (error || !data) {
    // get_admin_overview의 '권한이 없습니다' 포함 — 운영자 외에는 여기로 떨어진다(존재 누설 없이 일반 안내).
    return (
      <div className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] p-6 text-center">
        <p className="text-body-m-500 text-[var(--text-strong)]">접근 권한이 없습니다</p>
        <p className="mt-1 text-body-s-400 text-[var(--text-muted)]">
          운영자 계정으로만 열람할 수 있는 페이지입니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="총 회원" value={data.members_total} sub={`이번 주 신규 +${data.members_new_week}`} />
        <StatCard label="총 세션" value={data.sessions_total} sub={`최근 7일 ${data.sessions_week}회`} />
        <StatCard label="총 기술" value={data.techniques_total} sub="프리셋 포함" />
        <StatCard label="체육관" value={data.gyms_total} sub={`멤버 ${data.gym_members_total}명`} />
        <StatCard label="공유" value={data.shares_total} sub={`코멘트 ${data.comments_total}`} />
        <StatCard label="활성 디바이스" value={data.active_devices} sub="푸시 등록" />
      </div>
      <p className="text-body-xs-400 text-[var(--text-disabled)]">
        {new Date(data.generated_at).toLocaleString('ko-KR')} 기준 · 카운트만 표시(개인 데이터 비노출)
      </p>
    </div>
  );
}
