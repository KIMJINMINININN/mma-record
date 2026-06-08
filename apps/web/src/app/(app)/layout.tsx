import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { AppShell } from '@/widgets/app-shell';
import { SessionEditorHost } from '@/widgets/session-editor';
import { WebViewAuthBridge } from '@/features/webview-auth';
import { WebViewMediaBridge } from '@/features/media-upload';
import { WebViewReminderBridge } from '@/features/webview-reminder';
import { WebViewPushBridge } from '@/features/webview-push';
import { loadReminderForBridge } from '@/features/webview-reminder/api/load-reminder';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';

/**
 * (app) 라우트 그룹 레이아웃 — 인증 영역 공통 셸 + 인증 가드 (Develop §6.4 / §10).
 *
 * 모든 인증 후 화면(캘린더/기술/검색/프로필)을 AppShell(검색바+내비+FAB)로 감싼다.
 *
 * 인증 가드(env 게이팅):
 *  - NEXT_PUBLIC_AUTH_ENABLED=false(현재/인프라 전): 가드를 건너뛴다 →
 *    Supabase를 만지지 않으므로 (app) 라우트는 정적 프리렌더 가능(앱 셸 탐색 유지).
 *  - NEXT_PUBLIC_AUTH_ENABLED=true(인프라 후): getUser()로 세션 검증, 없으면 /login으로 redirect.
 *    이 시점부터 (app)은 동적 렌더가 된다(쿠키 접근).
 *
 * 세션 에디터 호스트(F3)는 AppShell 형제로 전역 1회 마운트한다 — 모든 (app) 라우트가
 * 하나의 오버레이를 공유한다(진입점은 FAB/day-detail/calendar, 상태는 shared 스토어).
 * 서버 레이아웃에서 클라이언트 컴포넌트(SessionEditorHost)를 렌더하는 것은 정상이다.
 */
export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  if (isAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect('/login');
  }

  // 리마인더 진입 동기화 — 현재 설정을 WebView 브리지 initial로 내려준다(앱 안에서만 네이티브로 push).
  // 도먼시(플래그 OFF)면 Supabase 무접촉으로 휴면 기본값 반환(정적 프리렌더 유지).
  const initialReminder = await loadReminderForBridge();

  return (
    <>
      <AppShell>{children}</AppShell>
      <SessionEditorHost />
      <WebViewAuthBridge />
      <WebViewMediaBridge />
      <WebViewReminderBridge initial={initialReminder} />
      <WebViewPushBridge />
    </>
  );
}
