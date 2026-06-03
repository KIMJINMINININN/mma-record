// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { LevelChip } from '@/entities/technique/ui/LevelChip';
import { LEVEL_META } from '@/entities/technique/lib/level-meta';
import { LEVELS } from '@/shared/model/enums';

afterEach(cleanup);

describe('LevelChip', () => {
  // ── LABEL RENDERING ───────────────────────────────────────────────────────

  describe('renders correct LEVEL_META label text', () => {
    it('beginner → "입문"', () => {
      render(<LevelChip level="beginner" />);
      expect(screen.getByText('입문')).toBeInTheDocument();
    });

    it('intermediate → "중급"', () => {
      render(<LevelChip level="intermediate" />);
      expect(screen.getByText('중급')).toBeInTheDocument();
    });

    it('advanced → "고급"', () => {
      render(<LevelChip level="advanced" />);
      expect(screen.getByText('고급')).toBeInTheDocument();
    });

    it('renders label for every Level', () => {
      for (const lv of LEVELS) {
        const { container } = render(<LevelChip level={lv} />);
        expect(container.firstElementChild!.textContent).toBe(LEVEL_META[lv].label);
        cleanup();
      }
    });
  });

  // ── DISPLAY-ONLY SPAN ─────────────────────────────────────────────────────

  it('renders a span (display only, no role=button)', () => {
    const { container } = render(<LevelChip level="beginner" />);
    const span = container.firstElementChild;
    expect(span!.tagName).toBe('SPAN');
    expect(span).not.toHaveAttribute('role', 'button');
  });

  // ── COLOR INJECTION (filled, tonal — BeltBadge-style var injection) ────────

  describe('color injection', () => {
    it('injects the level fill/text as --level-* CSS variables', () => {
      const { container } = render(<LevelChip level="advanced" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.style.getPropertyValue('--level-bg')).toBe(LEVEL_META.advanced.bg);
      expect(span.style.getPropertyValue('--level-bg-dark')).toBe(LEVEL_META.advanced.bgDark);
      expect(span.style.getPropertyValue('--level-fg')).toBe(LEVEL_META.advanced.fg);
      expect(span.style.getPropertyValue('--level-fg-dark')).toBe(LEVEL_META.advanced.fgDark);
    });

    it('uses the injected vars via bg/text utility classes (light)', () => {
      const { container } = render(<LevelChip level="beginner" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.className).toContain('bg-[var(--level-bg)]');
      expect(span.className).toContain('text-[var(--level-fg)]');
    });

    it('swaps fill/text in dark mode via dark: variant', () => {
      const { container } = render(<LevelChip level="beginner" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.className).toContain('dark:bg-[var(--level-bg-dark)]');
      expect(span.className).toContain('dark:text-[var(--level-fg-dark)]');
    });

    it('is filled (not bg-transparent like PositionChip)', () => {
      const { container } = render(<LevelChip level="beginner" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.className).not.toContain('bg-transparent');
    });
  });

  // ── A11Y: level context for screen readers ────────────────────────────────

  describe('accessibility', () => {
    it('exposes "레벨 <label>" as aria-label (level context, not bare label)', () => {
      const { container } = render(<LevelChip level="advanced" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.getAttribute('aria-label')).toBe('레벨 고급');
    });
  });

  // ── SIZE VARIANTS ─────────────────────────────────────────────────────────

  describe('size variants', () => {
    it('size=sm (default) uses px-2 py-1 padding classes', () => {
      const { container } = render(<LevelChip level="beginner" size="sm" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.className).toContain('px-2');
      expect(span.className).toContain('py-1');
    });

    it('size=xs uses px-1.5 py-0.5 padding classes', () => {
      const { container } = render(<LevelChip level="beginner" size="xs" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.className).toContain('px-1.5');
      expect(span.className).toContain('py-0.5');
    });
  });

  // ── className PROP ────────────────────────────────────────────────────────

  it('forwards className prop', () => {
    const { container } = render(<LevelChip level="beginner" className="custom-class" />);
    expect(container.firstElementChild).toHaveClass('custom-class');
  });
});
