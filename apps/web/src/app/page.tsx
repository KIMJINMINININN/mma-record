import { redirect } from 'next/navigation';

/**
 * 루트(`/`) — 캘린더를 홈으로 진입 (PRD §7: 캘린더가 기본 진입).
 */
export default function Root() {
  redirect('/calendar');
}
