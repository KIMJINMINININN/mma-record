// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagChip } from '@/entities/tag/ui/TagChip';

afterEach(cleanup);

describe('TagChip', () => {
  // ── '#' PREFIX (aria-hidden) + TEXT LABEL ─────────────────────────────────

  describe('hash prefix and label', () => {
    it('renders visible text of the label', () => {
      const { container } = render(<TagChip label="guard" />);
      expect(container.querySelector('.truncate')!.textContent).toBe('guard');
    });

    it('renders "#" as aria-hidden element', () => {
      const { container } = render(<TagChip label="guard" />);
      // The '#' span has aria-hidden="true"
      const hashEl = container.querySelector('[aria-hidden="true"]');
      expect(hashEl).not.toBeNull();
      expect(hashEl!.textContent).toBe('#');
    });

    it('root element has aria-label containing the tag name', () => {
      const { container } = render(<TagChip label="guard" />);
      const root = container.firstElementChild;
      expect(root).toHaveAttribute('aria-label', expect.stringContaining('guard'));
    });
  });

  // ── TRIPLE-ENCODING: '#' glyph + text label + aria-label ─────────────────
  // The '#' acts as the shape/glyph encoding; text provides the label.

  describe('triple encoding', () => {
    it('glyph (#, aria-hidden) + visible text label + aria-label all present', () => {
      const { container } = render(<TagChip label="sweep" />);

      // Shape glyph: aria-hidden '#'
      const hashEl = container.querySelector('[aria-hidden="true"]');
      expect(hashEl).not.toBeNull();
      expect(hashEl!.textContent).toBe('#');

      // Visible text label
      expect(container.querySelector('.truncate')!.textContent).toBe('sweep');

      // Accessible label on root
      const root = container.firstElementChild;
      expect(root).toHaveAttribute('aria-label', expect.stringContaining('sweep'));
    });
  });

  // ── SELECTED → aria-pressed ───────────────────────────────────────────────

  describe('selected state', () => {
    it('clickable + selected chip has aria-pressed=true', () => {
      const { container } = render(<TagChip label="guard" selected onClick={() => {}} />);
      // clickable → renders as <button>
      const btn = container.querySelector('button[aria-pressed]');
      expect(btn).not.toBeNull();
      expect(btn).toHaveAttribute('aria-pressed', 'true');
    });

    it('clickable + not-selected chip has aria-pressed=false', () => {
      const { container } = render(<TagChip label="guard" selected={false} onClick={() => {}} />);
      const btn = container.querySelector('button[aria-pressed]');
      expect(btn).not.toBeNull();
      expect(btn).toHaveAttribute('aria-pressed', 'false');
    });

    it('non-clickable span has no aria-pressed attribute', () => {
      const { container } = render(<TagChip label="guard" selected />);
      const root = container.firstElementChild;
      expect(root!.tagName).toBe('SPAN');
      expect(root).not.toHaveAttribute('aria-pressed');
    });
  });

  // ── REMOVABLE: remove button with accessible label ────────────────────────
  //
  // NOTE: When removable=true AND onClick is provided, the component nests a
  // <button> inside a <button> (HTML5 violation). jsdom/React renders this but
  // browsers collapse it. Tests below cover the non-nested (span-outer) case
  // and the clickable-only (button-outer) case separately.

  describe('removable (non-clickable outer = span)', () => {
    it('renders a remove button when removable=true', () => {
      const { container } = render(<TagChip label="guard" removable />);
      const btn = container.querySelector('button[aria-label="태그 guard 제거"]');
      expect(btn).not.toBeNull();
    });

    it('remove button has accessible label "태그 {label} 제거"', () => {
      const { container } = render(<TagChip label="sweep" removable />);
      const btn = container.querySelector('button[aria-label="태그 sweep 제거"]');
      expect(btn).not.toBeNull();
    });

    it('does NOT render a remove button when removable=false (default)', () => {
      const { container } = render(<TagChip label="guard" />);
      expect(container.querySelector('button')).toBeNull();
    });

    it('clicking remove button calls onRemove', async () => {
      const onRemove = vi.fn();
      const user = userEvent.setup();
      const { container } = render(<TagChip label="guard" removable onRemove={onRemove} />);
      const btn = container.querySelector('button[aria-label="태그 guard 제거"]') as HTMLButtonElement;
      await user.click(btn);
      expect(onRemove).toHaveBeenCalledOnce();
    });
  });

  describe('removable + clickable: no nested buttons, correct event routing', () => {
    it('root is a <span> (not a <button>) when both removable and onClick are set', () => {
      const { container } = render(
        <TagChip label="guard" removable onRemove={() => {}} onClick={() => {}} />,
      );
      const root = container.firstElementChild;
      expect(root!.tagName).toBe('SPAN');
    });

    it('both toggle button and remove button are queryable', () => {
      const { container } = render(
        <TagChip label="guard" removable onRemove={() => {}} onClick={() => {}} />,
      );
      const toggleBtn = container.querySelector('button[aria-pressed]');
      const removeBtn = container.querySelector('button[aria-label="태그 guard 제거"]');
      expect(toggleBtn).not.toBeNull();
      expect(removeBtn).not.toBeNull();
    });

    it('remove button is NOT a descendant of the toggle button (no nested <button>)', () => {
      const { container } = render(
        <TagChip label="guard" removable onRemove={() => {}} onClick={() => {}} />,
      );
      const toggleBtn = container.querySelector('button[aria-pressed]') as HTMLElement;
      const nestedRemove = toggleBtn.querySelector('button[aria-label="태그 guard 제거"]');
      expect(nestedRemove).toBeNull();
    });

    it('clicking remove button calls onRemove and NOT onClick', async () => {
      const onRemove = vi.fn();
      const onClick = vi.fn();
      const user = userEvent.setup();
      const { container } = render(
        <TagChip label="guard" removable onRemove={onRemove} onClick={onClick} />,
      );
      const removeBtn = container.querySelector(
        'button[aria-label="태그 guard 제거"]',
      ) as HTMLButtonElement;
      expect(removeBtn).not.toBeNull();
      await user.click(removeBtn);
      expect(onRemove).toHaveBeenCalledOnce();
      expect(onClick).not.toHaveBeenCalled();
    });

    it('clicking toggle button calls onClick and NOT onRemove', async () => {
      const onRemove = vi.fn();
      const onClick = vi.fn();
      const user = userEvent.setup();
      const { container } = render(
        <TagChip label="guard" removable onRemove={onRemove} onClick={onClick} />,
      );
      const toggleBtn = container.querySelector('button[aria-pressed]') as HTMLButtonElement;
      await user.click(toggleBtn);
      expect(onClick).toHaveBeenCalledOnce();
      expect(onRemove).not.toHaveBeenCalled();
    });
  });

  // ── CLICK TOGGLES (onClick) ───────────────────────────────────────────────

  describe('onClick', () => {
    it('clickable chip renders as a <button> root element', () => {
      const { container } = render(<TagChip label="guard" onClick={() => {}} />);
      const root = container.firstElementChild;
      expect(root!.tagName).toBe('BUTTON');
    });

    it('clicking chip button calls onClick', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      const { container } = render(<TagChip label="guard" onClick={onClick} />);
      // The outer chip button does NOT have aria-label="태그 guard 제거"
      const btn = container.firstElementChild as HTMLButtonElement;
      await user.click(btn);
      expect(onClick).toHaveBeenCalledOnce();
    });

    it('non-clickable chip renders as a <span> root element', () => {
      const { container } = render(<TagChip label="guard" />);
      expect(container.firstElementChild!.tagName).toBe('SPAN');
    });

    it('disabled chip renders as a span (clickable=false when disabled)', () => {
      // When disabled=true, clickable = !!onClick && !disabled = false → renders <span>
      const { container } = render(<TagChip label="guard" onClick={() => {}} disabled />);
      const root = container.firstElementChild;
      expect(root!.tagName).toBe('SPAN');
      // pointer-events-none via opacity-50 pointer-events-none class
      expect(root!.className).toContain('pointer-events-none');
    });
  });

  // ── ARIA-LABEL INCLUDES "선택됨" WHEN SELECTED ────────────────────────────

  describe('aria-label selected annotation', () => {
    it('clickable+selected aria-label includes "선택됨"', () => {
      const { container } = render(<TagChip label="guard" selected onClick={() => {}} />);
      const root = container.firstElementChild;
      expect(root).toHaveAttribute('aria-label', expect.stringContaining('선택됨'));
    });

    it('clickable+not-selected aria-label does not include "선택됨"', () => {
      const { container } = render(<TagChip label="guard" selected={false} onClick={() => {}} />);
      const root = container.firstElementChild;
      const ariaLabel = root!.getAttribute('aria-label') ?? '';
      expect(ariaLabel).not.toContain('선택됨');
    });

    it('non-clickable+selected span aria-label includes "선택됨"', () => {
      const { container } = render(<TagChip label="guard" selected />);
      const root = container.firstElementChild;
      expect(root).toHaveAttribute('aria-label', expect.stringContaining('선택됨'));
    });
  });

  // ── SIZE VARIANTS ─────────────────────────────────────────────────────────

  describe('size variants', () => {
    it('sm size (default) renders # glyph and label text', () => {
      const { container } = render(<TagChip label="guard" size="sm" />);
      expect(container.querySelector('[aria-hidden="true"]')!.textContent).toBe('#');
      expect(container.querySelector('.truncate')!.textContent).toBe('guard');
    });

    it('xs size renders # glyph and label text', () => {
      const { container } = render(<TagChip label="guard" size="xs" />);
      expect(container.querySelector('[aria-hidden="true"]')!.textContent).toBe('#');
      expect(container.querySelector('.truncate')!.textContent).toBe('guard');
    });
  });
});
