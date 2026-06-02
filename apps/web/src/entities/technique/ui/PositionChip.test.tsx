// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PositionChip } from '@/entities/technique/ui/PositionChip';
import { POSITION_LABEL } from '@/entities/technique/lib/position-meta';
import type { PositionKind } from '@/shared/model/enums';

afterEach(cleanup);

describe('PositionChip', () => {
  // ── LABEL RENDERING ───────────────────────────────────────────────────────

  describe('renders correct POSITION_LABEL text', () => {
    it('standing → "스탠딩"', () => {
      render(<PositionChip position="standing" />);
      expect(screen.getByText('스탠딩')).toBeInTheDocument();
    });

    it('closed_guard → "클로즈드 가드"', () => {
      render(<PositionChip position="closed_guard" />);
      expect(screen.getByText('클로즈드 가드')).toBeInTheDocument();
    });

    it('back_control → "백 컨트롤"', () => {
      render(<PositionChip position="back_control" />);
      expect(screen.getByText('백 컨트롤')).toBeInTheDocument();
    });

    it('other → "기타"', () => {
      render(<PositionChip position="other" />);
      expect(screen.getByText('기타')).toBeInTheDocument();
    });
  });

  describe('POSITION_LABEL lookup for all positions', () => {
    const allPositions = Object.keys(POSITION_LABEL) as PositionKind[];
    for (const position of allPositions) {
      it(`renders "${POSITION_LABEL[position]}" for position="${position}"`, () => {
        const { container } = render(<PositionChip position={position} />);
        expect(container.firstElementChild!.textContent).toBe(POSITION_LABEL[position]);
      });
    }
  });

  // ── OUTLINE STYLING ───────────────────────────────────────────────────────
  //
  // PositionChip = outline neutral chip (border + transparent bg + muted text).
  // Design §7d — differentiates from CategoryChip (filled) without using color.

  describe('outline styling', () => {
    it('renders a span (display only, no role=button)', () => {
      const { container } = render(<PositionChip position="standing" />);
      const span = container.firstElementChild;
      expect(span!.tagName).toBe('SPAN');
      expect(span).not.toHaveAttribute('role', 'button');
    });

    it('has inline-flex class for layout', () => {
      const { container } = render(<PositionChip position="standing" />);
      expect(container.firstElementChild).toHaveClass('inline-flex');
    });

    it('uses border-[var(--border-default)] class (outline style)', () => {
      const { container } = render(<PositionChip position="standing" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.className).toContain('border-[var(--border-default)]');
    });

    it('uses bg-transparent (not filled)', () => {
      const { container } = render(<PositionChip position="standing" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.className).toContain('bg-transparent');
    });

    it('uses text-[var(--text-muted)] (muted text)', () => {
      const { container } = render(<PositionChip position="standing" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.className).toContain('text-[var(--text-muted)]');
    });

    it('does NOT use bg-[var(--surface-sunken)] (not filled like CategoryChip)', () => {
      const { container } = render(<PositionChip position="standing" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.className).not.toContain('bg-[var(--surface-sunken)]');
    });
  });

  // ── PAIR DIFFERENTIABILITY FROM CategoryChip ──────────────────────────────
  //
  // When CategoryChip and PositionChip appear side by side, they must be
  // visually distinguishable without relying solely on color (F9-AC4).
  // CategoryChip = filled; PositionChip = outline. This is shape/style encoding.

  describe('outline vs filled differentiation from CategoryChip', () => {
    it('PositionChip has border class; CategoryChip import has none', async () => {
      // Import CategoryChip inline to compare class structures
      const { CategoryChip } = await import('@/entities/technique/ui/CategoryChip');

      const { container: posContainer } = render(<PositionChip position="mount" />);
      const { container: catContainer } = render(<CategoryChip category="guard" />);

      const posSpan = posContainer.firstElementChild as HTMLElement;
      const catSpan = catContainer.firstElementChild as HTMLElement;

      // PositionChip has border, CategoryChip does not
      expect(posSpan.className).toContain('border-[var(--border-default)]');
      expect(catSpan.className).not.toContain('border-[var(--border-default)]');

      // CategoryChip has sunken bg, PositionChip does not
      expect(catSpan.className).toContain('bg-[var(--surface-sunken)]');
      expect(posSpan.className).not.toContain('bg-[var(--surface-sunken)]');
    });
  });

  // ── SIZE VARIANTS ─────────────────────────────────────────────────────────

  describe('size variants', () => {
    it('size=sm (default) renders without error', () => {
      render(<PositionChip position="mount" />);
      expect(screen.getByText('마운트')).toBeInTheDocument();
    });

    it('size=xs renders without error', () => {
      render(<PositionChip position="mount" size="xs" />);
      expect(screen.getByText('마운트')).toBeInTheDocument();
    });

    it('size=sm uses px-2 py-1 padding classes', () => {
      const { container } = render(<PositionChip position="mount" size="sm" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.className).toContain('px-2');
      expect(span.className).toContain('py-1');
    });

    it('size=xs uses px-1.5 py-0.5 padding classes', () => {
      const { container } = render(<PositionChip position="mount" size="xs" />);
      const span = container.firstElementChild as HTMLElement;
      expect(span.className).toContain('px-1.5');
      expect(span.className).toContain('py-0.5');
    });
  });

  // ── className PROP ────────────────────────────────────────────────────────

  it('forwards className prop', () => {
    const { container } = render(<PositionChip position="mount" className="custom-class" />);
    expect(container.firstElementChild).toHaveClass('custom-class');
  });
});
