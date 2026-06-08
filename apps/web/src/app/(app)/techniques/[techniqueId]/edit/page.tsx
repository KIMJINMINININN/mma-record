import Link from 'next/link';

import { ChevronLeftIcon } from '@/shared/ui';
import { TechniqueForm } from '@/widgets/technique-editor';

/**
 * 기술 편집 (F4-AC1 / Design §7d) — 편집 폼 페이지.
 *
 * 뒤로 링크(기술 상세) + 제목 + TechniqueForm(mode="edit", techniqueId).
 * Next 16: params는 Promise → await로 풀어 techniqueId를 폼에 내린다 → 라우트는 동적(ƒ).
 *
 * prefill(F4-AC3): TechniqueForm(mode="edit")이 techniqueId로 기존 기술 본체·태그·미디어를
 * 페치해 폼에 채운다(AUTH ON). AUTH OFF면 빈 폼 셸 유지(도먼시 게이팅).
 */
export default async function TechniqueEditPage({
  params,
}: {
  params: Promise<{ techniqueId: string }>;
}) {
  const { techniqueId } = await params;

  return (
    <section aria-labelledby="technique-edit-heading" className="mx-auto max-w-3xl">
      {/* 뒤로 — 기술 상세 (Design §7d 헤더) */}
      <Link
        href={`/techniques/${techniqueId}`}
        className="mb-4 inline-flex items-center gap-1 rounded-xxs py-1 text-button-s text-[var(--text-muted)] outline-none transition-colors pointer-hover:text-[var(--text-default)] focus-visible:shadow-[var(--ring-focus)]"
      >
        <ChevronLeftIcon width={16} height={16} />
        기술 상세
      </Link>

      <h1 id="technique-edit-heading" className="mb-1 text-heading-l text-[var(--text-strong)]">
        기술 편집
      </h1>
      <p className="mb-5 text-body-s-400 text-[var(--text-muted)]">
        기술 정보를 수정합니다.
      </p>

      <TechniqueForm mode="edit" techniqueId={techniqueId} />
    </section>
  );
}
