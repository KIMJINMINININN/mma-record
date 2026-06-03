import { StatsScreen } from './stats-screen';

/**
 * 통계 대시보드 (F10 / PRD §F10) — 얇은 서버 컴포넌트.
 *
 * 집계/상태는 클라이언트 아일랜드(StatsScreen)가 소유한다(Pattern A).
 * 인증 가드 + AppShell은 (app) 그룹 레이아웃이 제공하므로 페이지엔 별도 인증 코드 없음.
 */
export default function StatsPage() {
  return <StatsScreen />;
}
