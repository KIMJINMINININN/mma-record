import { GymFeed } from '@/features/gym-share';

/**
 * 체육관 피드 — /gym/feed. (app) 그룹 인증가드 적용(소속자 전용 화면).
 * 관장=전체 공유 / 관원=본인 공유(서버 RPC가 분기). 상세·코멘트는 2b/2c.
 * SSoT: docs/issue/20260610/gym-phase2-plan.md
 */
export default function GymFeedPage() {
  return (
    <section className="mx-auto max-w-3xl">
      <GymFeed />
    </section>
  );
}
