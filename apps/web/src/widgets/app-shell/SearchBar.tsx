'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cx } from 'class-variance-authority';
import { SearchIcon } from '@/shared/ui';
// 순수 모델만 딥임포트 — 배럴은 server-only searchAll을 재노출하므로 클라 번들 오염을 피한다(FSD 예외).
import { buildSearchHref, parseFacetsFromSearchParams } from '@/features/global-search/model/search-params';

/**
 * SearchBar — 전역 상단 고정 검색바 (PRD §7 / F8 / Design §7a).
 *
 * 제출(Enter 또는 버튼) 시 `/search?q=...`로 이동(F8 진입점). 현재 URL의 패싯(?discipline/?period)이
 * 있으면 buildSearchHref로 **보존**해 검색어만 바꿔도 패싯이 유지된다(F8-AC4).
 * 입력값은 로컬 UI 상태(zustand 불필요 — 단일 입력의 임시값).
 * label은 시각적으로 숨기고(sr-only) placeholder/aria로 접근성 확보.
 */
export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = value.trim();
    if (!q) {
      router.push('/search');
      return;
    }
    const facets = parseFacetsFromSearchParams({
      discipline: searchParams.get('discipline') ?? undefined,
      period: searchParams.get('period') ?? undefined,
    });
    router.push(buildSearchHref(q, facets));
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cx('relative flex min-w-0 flex-1 items-center', className)}
    >
      <label htmlFor="global-search" className="sr-only">
        검색
      </label>
      <SearchIcon
        width={18}
        height={18}
        className="pointer-events-none absolute left-3 text-[var(--text-muted)]"
      />
      <input
        id="global-search"
        type="search"
        inputMode="search"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="검색 (기술·세션·태그…)"
        className={cx(
          'h-10 w-full rounded-xs pl-10 pr-3',
          'bg-[var(--surface-sunken)] text-body-s-400 text-[var(--text-default)]',
          'placeholder:text-[var(--text-muted)]',
          'border border-transparent',
          'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
          'outline-none focus-visible:border-[var(--primary)] focus-visible:shadow-[var(--ring-focus)]',
          // search clear(×) 버튼 기본 스타일 억제
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
      />
    </form>
  );
}
