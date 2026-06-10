import { GymSharedDetail } from './gym-shared-detail';

/**
 * 체육관 공유 항목 상세 — /gym/feed/[id] (id=gym_shares.id). (app) 인증가드 + gym 권한(RPC).
 * SSoT: docs/issue/20260610/gym-phase2-plan.md
 */
export default async function GymSharedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <section className="mx-auto max-w-3xl">
      <GymSharedDetail gymShareId={id} />
    </section>
  );
}
