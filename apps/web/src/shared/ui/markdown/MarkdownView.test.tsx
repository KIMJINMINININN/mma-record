// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownView } from '@/shared/ui/markdown/MarkdownView';

/**
 * MarkdownView XSS & rendering tests.
 *
 * useSyncExternalStore returns the CLIENT snapshot (true) in jsdom because
 * window is defined, so DOMPurify sanitization runs synchronously on first
 * render — no need for act/waitFor.
 */

describe('MarkdownView — allowed markdown renders', () => {
  it('renders a paragraph', () => {
    const { container } = render(<MarkdownView source="hello world" />);
    expect(container.querySelector('p')).not.toBeNull();
    expect(container.textContent).toContain('hello world');
  });

  it('renders strong/em', () => {
    const { container } = render(<MarkdownView source="**bold** and _italic_" />);
    expect(container.querySelector('strong')).not.toBeNull();
    expect(container.querySelector('em')).not.toBeNull();
  });

  it('renders unordered list', () => {
    // JSX string attributes don't process \n — use JS expression with real newlines
    const { container } = render(<MarkdownView source={"- a\n- b\n- c"} />);
    expect(container.querySelector('ul')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(3);
  });

  it('renders ordered list', () => {
    const { container } = render(<MarkdownView source={"1. a\n2. b"} />);
    expect(container.querySelector('ol')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('renders a link', () => {
    const { container } = render(<MarkdownView source="[click](https://example.com)" />);
    const a = container.querySelector('a');
    expect(a).not.toBeNull();
    expect(a?.getAttribute('href')).toBe('https://example.com');
  });

  it('renders inline code', () => {
    const { container } = render(<MarkdownView source="`const x = 1`" />);
    expect(container.querySelector('code')).not.toBeNull();
  });

  it('renders code block (pre)', () => {
    // Use JS expression so \n becomes a real newline (fenced block requires actual newlines)
    const { container } = render(<MarkdownView source={"```\nconst x = 1\n```"} />);
    expect(container.querySelector('pre')).not.toBeNull();
    expect(container.querySelector('pre code')).not.toBeNull();
  });

  it('renders blockquote', () => {
    const { container } = render(<MarkdownView source="> quote text" />);
    expect(container.querySelector('blockquote')).not.toBeNull();
    expect(container.textContent).toContain('quote text');
  });

  it('renders h3', () => {
    const { container } = render(<MarkdownView source="### Heading 3" />);
    expect(container.querySelector('h3')).not.toBeNull();
    expect(container.querySelector('h3')?.textContent).toContain('Heading 3');
  });

  it('renders h4', () => {
    const { container } = render(<MarkdownView source="#### Heading 4" />);
    expect(container.querySelector('h4')).not.toBeNull();
    expect(container.querySelector('h4')?.textContent).toContain('Heading 4');
  });

  it('renders hr', () => {
    const { container } = render(<MarkdownView source="---" />);
    expect(container.querySelector('hr')).not.toBeNull();
  });

  it('renders br (GFM line break: trailing spaces)', () => {
    // GFM: two trailing spaces + newline → <br>
    const { container } = render(<MarkdownView source={'line1  \nline2'} />);
    expect(container.querySelector('br')).not.toBeNull();
  });

  it('output is sanitized HTML rendered as DOM nodes, not raw text', () => {
    const { container } = render(<MarkdownView source="**bold**" />);
    // Should be a real <strong> element, not the literal string "**bold**"
    expect(container.querySelector('strong')).not.toBeNull();
    expect(container.textContent).not.toContain('**bold**');
  });
});

describe('MarkdownView — XSS: dangerous input is stripped', () => {
  it('strips <script> tags entirely', () => {
    const { container } = render(
      <MarkdownView source={'<script>alert(1)</script>harmless'} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('<script');
    expect(container.innerHTML).not.toContain('alert(1)');
  });

  it('strips <img onerror> XSS payload', () => {
    const { container } = render(
      <MarkdownView source={'<img src=x onerror=alert(1)>'} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
  });

  it('strips <iframe>', () => {
    const { container } = render(
      <MarkdownView source={'<iframe src="https://evil.example.com"></iframe>'} />,
    );
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.innerHTML).not.toContain('<iframe');
  });

  it('strips inline on* event handlers (onclick)', () => {
    const { container } = render(
      <MarkdownView source={'<p onclick="alert(1)">click me</p>'} />,
    );
    const p = container.querySelector('p');
    // <p> is allowed but onclick must be removed
    expect(p?.getAttribute('onclick')).toBeNull();
    expect(container.innerHTML).not.toContain('onclick');
  });

  it('strips inline on* event handlers (onmouseover)', () => {
    const { container } = render(
      <MarkdownView source={'<a href="https://ok.com" onmouseover="evil()">link</a>'} />,
    );
    const a = container.querySelector('a');
    expect(a?.getAttribute('onmouseover')).toBeNull();
    expect(container.innerHTML).not.toContain('onmouseover');
  });

  it('strips <style> tag', () => {
    const { container } = render(
      <MarkdownView source={'<style>body { display: none; }</style>visible'} />,
    );
    expect(container.querySelector('style')).toBeNull();
    expect(container.innerHTML).not.toContain('<style');
  });

  it('strips style attribute', () => {
    const { container } = render(
      <MarkdownView source={'<p style="color:red">text</p>'} />,
    );
    const p = container.querySelector('p');
    expect(p?.getAttribute('style')).toBeNull();
  });

  it('strips javascript: href', () => {
    const { container } = render(
      <MarkdownView source={'[evil](javascript:alert(1))'} />,
    );
    const a = container.querySelector('a');
    // DOMPurify removes javascript: hrefs — either no <a> or href is cleaned
    if (a) {
      const href = a.getAttribute('href') ?? '';
      expect(href.toLowerCase()).not.toContain('javascript:');
    }
    expect(container.innerHTML.toLowerCase()).not.toContain('javascript:alert');
  });

  it('strips data: URI href', () => {
    const { container } = render(
      <MarkdownView source={'[evil](data:text/html,<script>alert(1)</script>)'} />,
    );
    const a = container.querySelector('a');
    if (a) {
      const href = a.getAttribute('href') ?? '';
      expect(href.toLowerCase()).not.toMatch(/^data:/);
    }
  });

  it('h1/h2 are stripped (not in allowlist)', () => {
    const { container } = render(<MarkdownView source={'# Heading 1\n## Heading 2'} />);
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('h2')).toBeNull();
  });

  it('class attribute is stripped from allowed elements', () => {
    const { container } = render(
      <MarkdownView source={'<p class="injected">text</p>'} />,
    );
    const p = container.querySelector('p');
    expect(p?.getAttribute('class')).toBeNull();
  });
});

describe('MarkdownView — link hardening (target/rel hook)', () => {
  it('links get target="_blank"', () => {
    const { container } = render(<MarkdownView source="[link](https://example.com)" />);
    const a = container.querySelector('a');
    expect(a).not.toBeNull();
    expect(a?.getAttribute('target')).toBe('_blank');
  });

  it('links get rel="noopener noreferrer nofollow"', () => {
    const { container } = render(<MarkdownView source="[link](https://example.com)" />);
    const a = container.querySelector('a');
    expect(a?.getAttribute('rel')).toBe('noopener noreferrer nofollow');
  });

  it('link hardening applies even to multiple links', () => {
    const source = '[a](https://a.com) and [b](https://b.com)';
    const { container } = render(<MarkdownView source={source} />);
    const links = container.querySelectorAll('a');
    expect(links.length).toBeGreaterThanOrEqual(2);
    links.forEach((a) => {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener noreferrer nofollow');
    });
  });
});
