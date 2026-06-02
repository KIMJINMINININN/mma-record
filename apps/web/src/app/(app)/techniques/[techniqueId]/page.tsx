import { TechniqueDetailView } from '@/features/technique-library';

/**
 * 기술 상세 (F4-AC3 / F5 / F6 / Design §7d, §9.3) — RSC 셸.
 *
 * Next 16: params는 Promise → async 페이지에서 await (PRD 라우트 트리 [techniqueId]).
 * 레이아웃·실데이터 페치·게이팅(AUTH ON/OFF)·로딩/미발견/역참조 분기는 모두
 * 클라이언트 아일랜드 `TechniqueDetailView`(feature)가 담당한다 — 뒤로/수정 헤더 포함.
 * RSC는 라우트 파라미터만 풀어 뷰에 내린다(FSD: app → feature).
 *
 * AUTH OFF(개발 셸)면 뷰가 기존 라벨드 미리보기 플레이스홀더를 그대로 유지(쿼리 비활성, 휴면),
 * AUTH ON(현재)이면 techniqueId로 실데이터(제목/배지/설명/주의점/역참조 세션)를 렌더한다.
 */
export default async function TechniqueDetailPage({
  params,
}: {
  params: Promise<{ techniqueId: string }>;
}) {
  const { techniqueId } = await params;

  return <TechniqueDetailView techniqueId={techniqueId} />;
}
