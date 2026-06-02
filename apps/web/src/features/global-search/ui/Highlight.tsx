import { Fragment } from 'react';

/**
 * Highlight — 검색 키워드 하이라이트 (F8 / Design §7e).
 *
 * `text`에서 `query`(대소문자 무시)를 부분일치로 찾아 매칭 구간만 `<mark>`로 감싼다.
 * **XSS 안전**: query는 사용자 입력 → `dangerouslySetInnerHTML`을 절대 쓰지 않고
 * 순수 React 노드로 분할(split)해 렌더한다. 정규식 메타문자는 escape 후 매칭.
 *
 * 표시 전용 → 서버 컴포넌트.
 */

/** 정규식 메타문자 escape — query를 리터럴로 매칭(주입 방지). */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface HighlightProps {
  text: string;
  query: string;
  className?: string;
}

export function Highlight({ text, query, className }: HighlightProps) {
  const q = query.trim();
  if (q === '') {
    return className ? <span className={className}>{text}</span> : <>{text}</>;
  }

  // 캡처 그룹으로 split → 매칭 구간이 결과 배열의 홀수 인덱스로 보존된다.
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'gi'));
  const lower = q.toLowerCase();

  const nodes = parts.map((part, i) =>
    part.toLowerCase() === lower ? (
      <mark
        key={i}
        className="rounded-[2px] bg-[var(--primary-soft)] px-0.5 text-[var(--primary-active)]"
      >
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );

  return className ? <span className={className}>{nodes}</span> : <>{nodes}</>;
}
