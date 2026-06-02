import type { ReactNode } from 'react';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { QuickAddFab } from './QuickAddFab';

/**
 * AppShell — 앱 공통 크롬 (Develop §6.3 "냉장고 app-shell 자리 재작성" / Design §7).
 *
 * 레이아웃:
 *   [SideNav(md+ 고정폭)] | [ 컬럼: sticky TopBar + 스크롤 <main> ]
 *   + BottomNav(모바일 fixed) + QuickAddFab(전역 fixed)
 *
 * - 데스크톱: 좌측 사이드 내비 + 본문(캘린더 풀 그리드용 가로폭 최대, §10.2).
 * - 모바일: 단일 컬럼 + 하단 탭바. main 하단에 탭바+FAB 높이만큼 여백 확보.
 * - 서버 컴포넌트(자식 내비/검색/토글만 클라이언트). children은 각 라우트 페이지.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-[var(--surface-app)]">
      <SideNav />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 상단바: sticky + 상단 safe-area 흡수 */}
        <div className="sticky top-0 z-20 pt-[env(safe-area-inset-top)]">
          <TopBar />
        </div>

        {/* 본문: 모바일은 하단 탭바(약 56px)+FAB 공간만큼 패딩, md+는 표준 패딩 */}
        <main className="flex-1 px-3 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-4 md:px-6 md:pb-8">
          {children}
        </main>
      </div>

      <BottomNav />
      <QuickAddFab />
    </div>
  );
}
