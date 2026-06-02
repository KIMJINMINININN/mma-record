// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BeltBadge } from '@/entities/rank/ui/BeltBadge';
import { beltFullLabel } from '@/entities/rank/lib/belt-meta';

afterEach(cleanup);

describe('BeltBadge', () => {
  // ── TRIPLE-ENCODING: accessible label (color + shape-bar + TEXT) ──────────

  describe('accessible label (triple-encoding)', () => {
    it('renders role="img" on the root span', () => {
      render(<BeltBadge belt="blue" stripes={0} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('aria-label includes belt name for white belt', () => {
      render(<BeltBadge belt="white" />);
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('흰띠'));
    });

    it('aria-label includes belt name for each belt', () => {
      const cases: Array<[import('@/shared/model/enums').Belt, string]> = [
        ['white', '흰띠'],
        ['blue', '블루'],
        ['purple', '퍼플'],
        ['brown', '브라운'],
        ['black', '블랙'],
      ];
      for (const [belt, expectedLabel] of cases) {
        const { container, unmount } = render(<BeltBadge belt={belt} />);
        const img = container.querySelector('[role="img"]');
        expect(img).not.toBeNull();
        expect(img).toHaveAttribute('aria-label', expect.stringContaining(expectedLabel));
        unmount();
      }
    });

    it('showLabel=true renders beltFullLabel as visible text (stripes=0)', () => {
      render(<BeltBadge belt="blue" stripes={0} showLabel />);
      const label = beltFullLabel('blue', 0); // '블루'
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('showLabel=true renders beltFullLabel with roman numeral when stripes>0', () => {
      render(<BeltBadge belt="blue" stripes={2} showLabel />);
      const label = beltFullLabel('blue', 2); // '블루 · II'
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('showLabel=false suppresses visible text label', () => {
      render(<BeltBadge belt="blue" stripes={0} showLabel={false} />);
      expect(screen.queryByText('블루')).not.toBeInTheDocument();
      // role=img with aria-label still present (color + aria label remains)
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('블루'));
    });

    it('aria-label includes stripe count when stripes > 0', () => {
      render(<BeltBadge belt="blue" stripes={3} />);
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('스트라이프 3'));
    });

    it('aria-label does not mention stripes when stripes = 0', () => {
      render(<BeltBadge belt="blue" stripes={0} />);
      const ariaLabel = screen.getByRole('img').getAttribute('aria-label') ?? '';
      expect(ariaLabel).not.toContain('스트라이프');
    });
  });

  // ── STRIPE MARKS ──────────────────────────────────────────────────────────

  describe('stripe marks', () => {
    it('renders 0 stripe marks for stripes=0', () => {
      const { container } = render(<BeltBadge belt="blue" stripes={0} />);
      // stripe bar container only present when n>0
      const stripeBar = container.querySelector('.flex.h-full');
      expect(stripeBar).toBeNull();
    });

    it('renders 1 stripe mark for stripes=1', () => {
      const { container } = render(<BeltBadge belt="blue" stripes={1} />);
      // Each stripe is a <span> with style width/height inside the flex container
      const stripeContainer = container.querySelector('.flex.h-full');
      expect(stripeContainer).not.toBeNull();
      expect(stripeContainer!.children).toHaveLength(1);
    });

    it('renders 2 stripe marks for stripes=2', () => {
      const { container } = render(<BeltBadge belt="blue" stripes={2} />);
      const stripeContainer = container.querySelector('.flex.h-full');
      expect(stripeContainer!.children).toHaveLength(2);
    });

    it('renders 3 stripe marks for stripes=3', () => {
      const { container } = render(<BeltBadge belt="blue" stripes={3} />);
      expect(container.querySelector('.flex.h-full')!.children).toHaveLength(3);
    });

    it('renders 4 stripe marks for stripes=4', () => {
      const { container } = render(<BeltBadge belt="blue" stripes={4} />);
      expect(container.querySelector('.flex.h-full')!.children).toHaveLength(4);
    });

    it('clamps stripes>4 to 4', () => {
      const { container } = render(<BeltBadge belt="blue" stripes={10} />);
      expect(container.querySelector('.flex.h-full')!.children).toHaveLength(4);
    });

    it('clamps stripes<0 to 0 (no stripe container)', () => {
      const { container } = render(<BeltBadge belt="blue" stripes={-1} />);
      expect(container.querySelector('.flex.h-full')).toBeNull();
    });
  });

  // ── SIZE VARIANTS ─────────────────────────────────────────────────────────

  describe('size variants', () => {
    it('size=xs renders the component without error', () => {
      const { container } = render(<BeltBadge belt="blue" size="xs" />);
      expect(container.querySelector('[role="img"]')).toBeInTheDocument();
    });

    it('size=sm (default) renders the component', () => {
      const { container } = render(<BeltBadge belt="blue" />);
      expect(container.querySelector('[role="img"]')).toBeInTheDocument();
    });

    it('size=md renders the component', () => {
      const { container } = render(<BeltBadge belt="blue" size="md" />);
      expect(container.querySelector('[role="img"]')).toBeInTheDocument();
    });

    it('size=xs uses text-button-xxs label class', () => {
      const { container } = render(<BeltBadge belt="blue" size="xs" showLabel />);
      const labelEl = container.querySelector('.text-button-xxs');
      expect(labelEl).not.toBeNull();
    });

    it('size=sm uses text-button-xs label class', () => {
      const { container } = render(<BeltBadge belt="blue" size="sm" showLabel />);
      const labelEl = container.querySelector('.text-button-xs');
      expect(labelEl).not.toBeNull();
    });
  });

  // ── ALL BELT SMOKE TEST ───────────────────────────────────────────────────

  describe('all belts render', () => {
    const belts = ['white', 'blue', 'purple', 'brown', 'black'] as const;
    for (const belt of belts) {
      it(`renders without error for belt="${belt}"`, () => {
        const { container } = render(<BeltBadge belt={belt} stripes={2} />);
        expect(container.querySelector('[role="img"]')).toBeInTheDocument();
      });
    }
  });
});
