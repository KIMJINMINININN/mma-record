import Link from 'next/link';

import { ChevronLeftIcon } from '@/shared/ui';
import { TechniqueForm } from '@/widgets/technique-editor';

/**
 * 기술 추가 (F4-AC1 / Design §7d) — 생성 폼 페이지.
 *
 * 뒤로 링크(라이브러리) + 제목 + TechniqueForm(mode="create").
 * 폼은 클라이언트 아일랜드(widget)고 RSC는 fetch/searchParams를 읽지 않으므로 라우트는 **정적(static)**이다.
 * 저장은 도먼시(env-gated) — 위젯이 처리한다(인프라 전엔 Supabase 호출 없이 안내 토스트).
 */
export default function TechniqueNewPage() {
  return (
    <section aria-labelledby="technique-new-heading" className="mx-auto max-w-3xl">
      {/* 뒤로 — 라이브러리 (Design §7d 헤더) */}
      <Link
        href="/techniques"
        className="mb-4 inline-flex items-center gap-1 rounded-xxs py-1 text-button-s text-[var(--text-muted)] outline-none transition-colors pointer-hover:text-[var(--text-default)] focus-visible:shadow-[var(--ring-focus)]"
      >
        <ChevronLeftIcon width={16} height={16} />
        라이브러리
      </Link>

      <h1 id="technique-new-heading" className="mb-1 text-heading-l text-[var(--text-strong)]">
        기술 추가
      </h1>
      <p className="mb-5 text-body-s-400 text-[var(--text-muted)]">
        이름과 종목만으로 빠르게 만들고, 디테일은 나중에 채워도 됩니다.
      </p>

      <TechniqueForm mode="create" />
    </section>
  );
}
