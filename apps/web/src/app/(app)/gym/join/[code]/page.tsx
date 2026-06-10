import { GymJoinView } from '@/features/gym';

/**
 * 체육관 초대 링크 — /gym/join/[code].
 * (app) 그룹 안이라 비로그인은 layout 가드가 /login으로 보낸다(가입은 로그인 필수).
 * SSoT: docs/issue/20260610/gym-team-spaces-plan.md
 */
export default async function GymJoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <section aria-labelledby="gym-join-heading" className="mx-auto max-w-md">
      <h1 id="gym-join-heading" className="sr-only">
        체육관 가입
      </h1>
      <GymJoinView code={code} />
    </section>
  );
}
