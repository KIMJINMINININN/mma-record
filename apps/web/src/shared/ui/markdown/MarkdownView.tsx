'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { marked } from 'marked';
import DOMPurify, { type Config as DOMPurifyConfig } from 'dompurify';
import { cx } from 'class-variance-authority';

/**
 * MarkdownView — 사용자 작성 마크다운 안전 렌더러 (Develop F6 / PRD F6 — 기술 설명/주의점, 세션 memo_md).
 *
 * ▣ XSS 파이프라인 (절대 우회 금지):
 *   1) `marked.parse(src, { async:false })` → 마크다운을 HTML 문자열로 변환(동기, string 반환).
 *   2) `DOMPurify.sanitize(html, STRICT 화이트리스트)` → 허용 태그/속성만 남기고 전부 제거.
 *   3) 정제된 HTML만 `dangerouslySetInnerHTML`로 주입. 정제 전 원본 HTML은 절대 주입하지 않는다.
 *   화이트리스트는 인라인 강조 + 목록 + 링크 + 코드/인용 수준만 허용 — img/script/style/iframe/
 *   on*핸들러/style속성 모두 차단(F6 보안 요구). 링크는 hook으로 강제 `rel`/`target` 부여.
 *
 * ▣ SSR/프리렌더 안전성 (★ 핵심 — `(app)` 라우트는 `○ Static`으로 프리렌더됨):
 *   DOMPurify는 브라우저 DOM(`window`)이 있어야 동작한다. `'use client'` 컴포넌트라도 프리렌더
 *   단계에서는 서버에서 한 번 렌더되며 그때 `window`가 없다 → 서버에서 `sanitize`를 호출하면 안 된다.
 *   클라이언트/서버 분기는 `useSyncExternalStore`로 한다: server snapshot=`false`, client snapshot=`true`.
 *   즉 SSR/프리렌더에선 항상 `false`, 하이드레이션 이후 클라이언트에선 `true`를 반환한다(effect·setState 없음
 *   → react-hooks/set-state-in-effect 위반 없음). 실제 정제는 `isClient === true`일 때만 `useMemo`로 수행하므로
 *   sanitize는 **하이드레이션 이후 렌더(클라이언트)** 에서만 호출되고 서버/프리렌더 경로에선 절대 실행되지 않는다.
 *   SSR/첫 페인트(`!isClient`) 동안은 마크다운 원본을 **평문**으로 출력하는 주입-안전 폴백을 렌더한다(텍스트
 *   노드라 HTML 주입 불가, sanitize/DOM 불필요). 이 패턴 덕에 빌드가 green으로 유지되고 라우트가 Static으로
 *   남는다(jsdom polyfill 불필요).
 *
 * FSD: shared/ui — react + (루트 레벨) marked/dompurify만 import. 상위 레이어 import 없음.
 */

/**
 * DOMPurify STRICT 화이트리스트.
 * 허용 태그: 문단/줄바꿈/인라인 강조/목록/링크/코드·인용/소제목·구분선만.
 * 허용 속성: 링크의 href/title만 (target/rel은 hook이 강제 부여).
 * img·script·style·iframe·on*·style속성·class 등은 전부 제거된다.
 */
const SANITIZE_CONFIG: DOMPurifyConfig = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    'b',
    'i',
    'del',
    'ul',
    'ol',
    'li',
    'a',
    'code',
    'pre',
    'blockquote',
    'h3',
    'h4',
    'hr',
  ],
  ALLOWED_ATTR: ['href', 'title'],
};

/**
 * 외부 링크 안전화 hook을 모듈 스코프에서 단 한 번만 등록.
 * 모든 `<a>`에 `target="_blank"` + `rel="noopener noreferrer nofollow"`를 강제해
 * 탭내빙(tabnabbing)·레퍼러 누출·SEO 신뢰 전가를 차단한다.
 * 서버(`window` 부재)에서는 등록하지 않는다 — sanitize 자체가 클라이언트에서만 호출되므로 안전.
 *
 * ⚠️ 프로세스-전역 등록: `DOMPurify.addHook`은 DOMPurify 모듈 싱글톤을 변형하므로, 이 hook은
 *    MarkdownView뿐 아니라 같은 프로세스의 **모든** `DOMPurify.sanitize` 호출에 적용된다. 현재는
 *    MarkdownView가 유일한 DOMPurify 소비자라 충돌이 없다. 만약 링크 동작이 다른(예: 같은 탭 이동을
 *    원하는 메일/내부링크 렌더러) 두 번째 소비자가 추가되면 이 강제 `target`/`rel`을 의도치 않게 상속한다.
 *    그 경우 이 hook을 이 모듈 전용의 격리된 인스턴스(`DOMPurify(window)`)로 옮기거나 React 렌더 시점에
 *    적용하도록 분리할 것.
 */
let hookRegistered = false;
function ensureHook(): void {
  if (hookRegistered || typeof window === 'undefined') return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });
  hookRegistered = true;
}

/**
 * 프로즈 스타일 — Tailwind typography 플러그인 없이 자식 요소를 arbitrary variant로 직접 스타일링.
 * 색·크기·radius·border는 semantic 토큰만 참조(hex 금지) → 다크 자동 대응.
 */
const PROSE_CLASS =
  'text-body-s-400 text-[var(--text-default)] ' +
  '[&_p]:my-1 ' +
  '[&_strong]:font-semibold [&_strong]:text-[var(--text-strong)] ' +
  '[&_b]:font-semibold [&_b]:text-[var(--text-strong)] ' +
  '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 ' +
  '[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 ' +
  '[&_li]:my-0.5 ' +
  '[&_a]:text-[var(--primary)] [&_a]:underline [&_a]:underline-offset-2 ' +
  '[&_h3]:text-heading-xs [&_h3]:mt-2 ' +
  '[&_h4]:font-semibold [&_h4]:mt-2 ' +
  '[&_code]:rounded-xxs [&_code]:bg-[var(--surface-sunken)] [&_code]:px-1 ' +
  '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-xs [&_pre]:bg-[var(--surface-sunken)] [&_pre]:p-3 ' +
  '[&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border-strong)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--text-muted)] ' +
  '[&_hr]:my-3 [&_hr]:border-[var(--border-subtle)]';

/**
 * useSyncExternalStore용 클라이언트 감지.
 * - subscribe: 값이 변하지 않으므로 구독 불필요 → no-op(언구독 함수만 반환).
 * - getSnapshot(클라이언트): 항상 `true`.
 * - getServerSnapshot(SSR/프리렌더): 항상 `false`.
 * 결과적으로 SSR=false, 하이드레이션 이후 client=true가 되어 effect/setState 없이 환경을 분기한다.
 */
const noopSubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export interface MarkdownViewProps {
  /** 렌더할 마크다운 원본 문자열. */
  source: string;
  /** 컨테이너에 병합할 추가 클래스. */
  className?: string;
}

/**
 * 마크다운을 XSS-안전하게 렌더. 정제(marked→DOMPurify)는 하이드레이션 이후 렌더(클라이언트)에서만
 * 수행하고, SSR/첫 페인트에는 원본을 평문(`whitespace-pre-wrap`)으로 폴백 렌더한다.
 */
export function MarkdownView({ source, className }: MarkdownViewProps) {
  // SSR/프리렌더=false, 하이드레이션 이후 클라이언트=true → sanitize가 서버에서 실행되는 일을 원천 차단.
  const isClient = useSyncExternalStore(noopSubscribe, getClientSnapshot, getServerSnapshot);

  // 정제된 HTML 파생값. 클라이언트(하이드레이션 이후)에서만 계산. SSR/첫 페인트에는 null.
  const html = useMemo(() => {
    if (!isClient) return null;
    ensureHook();
    // async:false 오버로드 → ParserOutput(=string) 반환. Promise 가능성 없음.
    const raw = marked.parse(source, { gfm: true, breaks: true, async: false });
    return DOMPurify.sanitize(raw, SANITIZE_CONFIG);
  }, [isClient, source]);

  // SSR/첫 페인트: 주입-안전 평문 폴백 (sanitize·DOM 불필요, window 부재에서도 안전).
  if (html === null) {
    return (
      <div className={cx(PROSE_CLASS, className)}>
        <p className="whitespace-pre-wrap">{source}</p>
      </div>
    );
  }

  // 마운트 이후: 정제된 HTML만 주입.
  return (
    <div
      className={cx(PROSE_CLASS, className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
