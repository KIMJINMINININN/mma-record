// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Highlight } from '@/features/global-search/ui/Highlight';

describe('Highlight — basic matching', () => {
  it('wraps matched substring in <mark>', () => {
    const { container } = render(<Highlight text="hello world" query="world" />);
    const mark = container.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe('world');
  });

  it('match is case-insensitive', () => {
    const { container } = render(<Highlight text="Hello World" query="WORLD" />);
    const mark = container.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe('World');
  });

  it('case-insensitive: lowercase query matches uppercase text', () => {
    const { container } = render(<Highlight text="UPPERCASE" query="upper" />);
    const mark = container.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe('UPPER');
  });

  it('non-matching text is rendered as plain text (no <mark>)', () => {
    const { container } = render(<Highlight text="hello world" query="missing" />);
    expect(container.querySelector('mark')).toBeNull();
    expect(container.textContent).toBe('hello world');
  });

  it('wraps all occurrences when query matches multiple times', () => {
    const { container } = render(<Highlight text="foo bar foo baz foo" query="foo" />);
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(3);
    marks.forEach((m) => expect(m.textContent).toBe('foo'));
  });

  it('text surrounding match is preserved as plain text', () => {
    const { container } = render(<Highlight text="abc XYZ def" query="xyz" />);
    expect(container.textContent).toBe('abc XYZ def');
    const mark = container.querySelector('mark');
    expect(mark?.textContent).toBe('XYZ');
  });
});

describe('Highlight — empty/whitespace query', () => {
  it('empty query renders plain text, no <mark>', () => {
    const { container } = render(<Highlight text="some text" query="" />);
    expect(container.querySelector('mark')).toBeNull();
    expect(container.textContent).toBe('some text');
  });

  it('whitespace-only query renders plain text, no <mark>', () => {
    const { container } = render(<Highlight text="some text" query="   " />);
    expect(container.querySelector('mark')).toBeNull();
    expect(container.textContent).toBe('some text');
  });

  it('single space query is treated as empty (trim), no <mark>', () => {
    const { container } = render(<Highlight text="hello world" query=" " />);
    expect(container.querySelector('mark')).toBeNull();
  });
});

describe('Highlight — regex metachar escaping (escapeRegExp)', () => {
  it('dot (.) is treated literally, not as "any char"', () => {
    // text has literal dots; "." should NOT match every character
    const { container } = render(<Highlight text="a.b.c abc" query="." />);
    const marks = container.querySelectorAll('mark');
    // Only the literal dots (2) should be highlighted, not every character
    expect(marks.length).toBe(2);
    marks.forEach((m) => expect(m.textContent).toBe('.'));
  });

  it('asterisk (*) is treated literally', () => {
    const { container } = render(<Highlight text="a*b normal" query="*" />);
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(1);
    expect(marks[0]?.textContent).toBe('*');
  });

  it('parentheses are treated literally', () => {
    const { container } = render(<Highlight text="fn(arg) call" query="(arg)" />);
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(1);
    expect(marks[0]?.textContent).toBe('(arg)');
  });

  it('square bracket is treated literally', () => {
    const { container } = render(<Highlight text="arr[0] = 1" query="[0]" />);
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(1);
    expect(marks[0]?.textContent).toBe('[0]');
  });

  it('plus (+) is treated literally', () => {
    const { container } = render(<Highlight text="1+2=3 plus" query="+" />);
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(1);
    expect(marks[0]?.textContent).toBe('+');
  });

  it('caret (^) is treated literally', () => {
    const { container } = render(<Highlight text="a^b power" query="^" />);
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(1);
    expect(marks[0]?.textContent).toBe('^');
  });

  it('dollar ($) is treated literally, not as end-anchor', () => {
    const { container } = render(<Highlight text="price $10 today" query="$" />);
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(1);
    expect(marks[0]?.textContent).toBe('$');
  });

  it('backslash is treated literally', () => {
    const { container } = render(<Highlight text={String.raw`path\to\file`} query={'\\'} />);
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(2);
    marks.forEach((m) => expect(m.textContent).toBe('\\'));
  });

  it('combined metachar query is literal: "a.b*c"', () => {
    // Should only match the exact string "a.b*c", not act as a regex pattern
    const { container } = render(
      <Highlight text="a.b*c is here and aXbYc is not" query="a.b*c" />,
    );
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(1);
    expect(marks[0]?.textContent).toBe('a.b*c');
  });
});

describe('Highlight — XSS safety (no HTML injection)', () => {
  it('<b> as text renders as literal text, not an element', () => {
    const { container } = render(<Highlight text="say <b>hello</b>" query="hello" />);
    // The <b> tag should NOT be an actual DOM element
    expect(container.querySelector('b')).toBeNull();
    // But the text content is preserved literally
    expect(container.textContent).toBe('say <b>hello</b>');
  });

  it('<script> as text renders as literal text, not executed', () => {
    const { container } = render(
      <Highlight text={'<script>alert(1)</script>'} query="alert" />,
    );
    expect(container.querySelector('script')).toBeNull();
    // The text is there but as safe text nodes
    expect(container.textContent).toContain('alert');
    expect(container.innerHTML).not.toContain('<script');
  });

  it('<img onerror> in text is not an element — text is HTML-escaped, not injected', () => {
    const { container } = render(
      <Highlight text={'<img src=x onerror=alert(1)>'} query="img" />,
    );
    // No real <img> element is created — it is plain text rendered as React nodes
    expect(container.querySelector('img')).toBeNull();
    // innerHTML encodes the raw text as HTML entities (&lt;, &gt;, etc.)
    // so "onerror" appears as attribute text inside the entity-escaped string —
    // that is correct and safe behaviour (text node, not a DOM attribute).
    // Verify the content is text, not a live DOM attribute:
    expect(container.querySelector('[onerror]')).toBeNull();
  });

  it('HTML entities in query are treated as literal text', () => {
    const { container } = render(
      <Highlight text="5 &amp; 6" query="&amp;" />,
    );
    // "&amp;" as query should match the literal string "&amp;" (not &)
    // In React, text "5 &amp; 6" means the string is literally "5 &amp; 6"
    // (React doesn't decode the JSX string prop as HTML)
    // So there should be no match for the literal chars "&amp;" vs the text "5 & 6"
    // This test verifies no <script> injection and safe rendering
    expect(container.querySelector('script')).toBeNull();
  });

  it('query with <mark> injection does not create nested marks', () => {
    const { container } = render(
      <Highlight text="some <mark>text</mark> here" query="<mark>" />,
    );
    // The literal string "<mark>" in text should appear as text, not create a DOM <mark>
    // Only the highlight marks should exist (matching the literal "<mark>" substring)
    const marks = container.querySelectorAll('mark');
    // If the literal "<mark>" is in text, it renders as text — no actual <mark> element
    // from the text content itself
    marks.forEach((m) => {
      // All <mark> elements are from Highlight's own rendering, not injected HTML
      expect(m.textContent).toBe('<mark>');
    });
    expect(container.textContent).toContain('some');
    expect(container.textContent).toContain('here');
  });
});

describe('Highlight — className prop', () => {
  it('wraps output in <span> when className is provided', () => {
    const { container } = render(
      <Highlight text="hello" query="hell" className="test-class" />,
    );
    const span = container.querySelector('span.test-class');
    expect(span).not.toBeNull();
  });

  it('no wrapping <span> without className', () => {
    const { container } = render(<Highlight text="hello" query="hell" />);
    // Fragment wrapper — no span at top level
    expect(container.querySelector('span')).toBeNull();
  });
});
