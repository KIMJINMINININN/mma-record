// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { ExternalLinkCard } from './ExternalLinkCard';

/**
 * ExternalLinkCard — 외부 링크 카드. 클라 경량 프리뷰(도메인 아바타 + clean 도메인 + 제목).
 * 순수 표시 컴포넌트(훅/외부 fetch 없음) — domainAvatar 도 순수 계산이라 mock 불필요.
 */
afterEach(cleanup);

describe('ExternalLinkCard', () => {
  it('안전한 https URL → 새 탭 앵커(rel/target) + clean 도메인 라벨', () => {
    render(<ExternalLinkCard url="https://www.instagram.com/p/abc" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://www.instagram.com/p/abc');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByText('instagram.com')).toBeInTheDocument(); // www. 제거된 도메인 라벨
  });

  it('도메인 아바타 첫 글자(대문자)', () => {
    render(<ExternalLinkCard url="https://youtube.com/watch?v=x" />);
    expect(screen.getByText('Y')).toBeInTheDocument();
  });

  it('title 있으면 caption = title (도메인은 타일에만, 중복 없음)', () => {
    render(<ExternalLinkCard url="https://ex.com" title="베림볼로 튜토리얼" />);
    expect(screen.getByText('베림볼로 튜토리얼')).toBeInTheDocument();
  });

  it('안전하지 않은 URL(javascript:) → 렌더하지 않음(null)', () => {
    const { container } = render(<ExternalLinkCard url="javascript:alert(1)" />);
    expect(container.querySelector('a')).toBeNull();
  });
});
