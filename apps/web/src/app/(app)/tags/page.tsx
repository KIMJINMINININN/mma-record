import { TagsView } from './tags-view';

/**
 * 태그 보기 (F7-AC2/AC3 / Design §7f).
 *
 * 헤더("태그 보기") + TagsView(선택 AND 바 + 결과 그룹). 선택/필터/조회는 client 아일랜드가 담당한다.
 *
 * 데이터(읽기 와이어링 #5): page 자체는 Supabase/searchParams 를 읽지 않는 얇은 셸이고,
 * TagsView 가 자동완성(fetchTagNames)·AND 결과(fetchTaggedItems)를 직접 `useQuery`로 읽는다
 * (`enabled: isAuthEnabled()`). 라우트는 점등 후 (app) 그룹 공통으로 동적(ƒ) 렌더된다 —
 * (app)/layout 이 getUser()로 세션을 검증(쿠키 접근)하기 때문(이 page 의 데이터 의존 때문이 아님).
 */
export default function TagsPage() {
  return (
    <section aria-labelledby="tags-heading" className="mx-auto max-w-5xl">
      <h1 id="tags-heading" className="mb-4 text-heading-l text-[var(--text-strong)]">
        태그 보기
      </h1>

      <TagsView />
    </section>
  );
}
