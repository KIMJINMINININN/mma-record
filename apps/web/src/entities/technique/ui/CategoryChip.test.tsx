// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';import { CategoryChip } from '@/entities/technique/ui/CategoryChip';
import { CATEGORY_LABEL } from '@/entities/technique/lib/category-meta';
import type { TechniqueCategory } from '@/shared/model/enums';

afterEach(cleanup);

describe('CategoryChip', () => {
  // ── LABEL RENDERING ───────────────────────────────────────────────────────

  describe('renders correct CATEGORY_LABEL text', () => {
    it('guard → "가드"', () => {
      render(<CategoryChip category="guard" />);
      expect(screen.getByText('가드')).toBeInTheDocument();
    });

    it('submission → "서브미션"', () => {
      render(<CategoryChip category="submission" />);
      expect(screen.getByText('서브미션')).toBeInTheDocument();
    });

    it('punch → "펀치"', () => {
      render(<CategoryChip category="punch" />);
      expect(screen.getByText('펀치')).toBeInTheDocument();
    });

    it('cage_work → "케이지워크"', () => {
      render(<CategoryChip category="cage_work" />);
      expect(screen.getByText('케이지워크')).toBeInTheDocument();
    });

    it('ground_and_pound → "그라운드앤파운드"', () => {
      render(<CategoryChip category="ground_and_pound" />);
      expect(screen.getByText('그라운드앤파운드')).toBeInTheDocument();
    });
  });

  describe('CATEGORY_LABEL lookup for all categories', () => {
    const allCategories = Object.keys(CATEGORY_LABEL) as TechniqueCategory[];
    for (const category of allCategories) {
      it(`renders "${CATEGORY_LABEL[category]}" for category="${category}"`, () => {
        const { container } = render(<CategoryChip category={category} />);
        expect(container.firstElementChild!.textContent).toBe(CATEGORY_LABEL[category]);
      });
    }
  });

  // ── NEUTRAL / FILLED STYLING ──────────────────────────────────────────────
  //
  // CategoryChip = filled neutral chip (bg-[var(--surface-sunken)]).
  // PositionChip = outline neutral chip (border + transparent bg).
  // Design §7d — "색 없이도 분류 ↔ 포지션 페어로 자연스럽게 읽힌다."

  describe('neutral filled styling', () => {
    it('renders a span (display only, no role=button)', () => {
      const { container } = render(<CategoryChip category="guard" />);
      const span = container.firstElementChild;
      expect(span!.tagName).toBe('SPAN');
      expect(span).not.toHaveAttribute('role', 'button');
    });

    it('has inline-flex class for layout', () => {
      const { container } = render(<CategoryChip category="guard" />);
      expect(container.firstElementChild).toHaveClass('inline-flex');
    });

    it('uses bg-[var(--surface-sunken)] class (filled neutral)', () => {
      const { container } = render(<CategoryChip category="guard" />);
      const span = container.firstElementChild as HTMLElement;
      // class string check — arbitrary value Tailwind class
      expect(span.className).toContain('bg-[var(--surface-sunken)]');
    });

    it('does NOT have border class (filled, not outline)', () => {
      const { container } = render(<CategoryChip category="guard" />);
      const span = container.firstElementChild as HTMLElement;
      // Should not have the outline border pattern used by PositionChip
      expect(span.className).not.toContain('border-[var(--border-default)]');
    });
  });

  // ── SIZE VARIANTS ─────────────────────────────────────────────────────────

  describe('size variants', () => {
    it('size=sm (default) renders without error', () => {
      render(<CategoryChip category="guard" />);
      expect(screen.getByText('가드')).toBeInTheDocument();
    });

    it('size=xs renders without error', () => {
      render(<CategoryChip category="guard" size="xs" />);
      expect(screen.getByText('가드')).toBeInTheDocument();
    });

    it('size=sm uses px-2 py-1 padding classes', () => {
      const { container } = render(<CategoryChip category="guard" size="sm" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.className).toContain('px-2');
      expect(span.className).toContain('py-1');
    });

    it('size=xs uses px-1.5 py-0.5 padding classes', () => {
      const { container } = render(<CategoryChip category="guard" size="xs" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.className).toContain('px-1.5');
      expect(span.className).toContain('py-0.5');
    });
  });

  // ── className PROP ────────────────────────────────────────────────────────

  it('forwards className prop', () => {
    const { container } = render(<CategoryChip category="guard" className="custom-class" />);
    expect(container.firstElementChild).toHaveClass('custom-class');
  });
});
