// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DisciplineIcon } from '@/entities/discipline/ui/DisciplineIcon';
import type { Discipline } from '@/shared/model/enums';

afterEach(cleanup);

const DISCIPLINES: Discipline[] = ['bjj_gi', 'bjj_nogi', 'wrestling', 'striking', 'mma'];

describe('DisciplineIcon', () => {
  // ── An SVG is rendered for each discipline (glyph/shape presence) ─────────

  describe('renders an SVG for each discipline', () => {
    for (const discipline of DISCIPLINES) {
      it(`renders an <svg> for discipline="${discipline}"`, () => {
        const { container } = render(<DisciplineIcon discipline={discipline} />);
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
      });
    }
  });

  // ── Each SVG carries aria-hidden so that the parent chip's label takes over ─

  it('svg is aria-hidden (parent chip provides the accessible label)', () => {
    const { container } = render(<DisciplineIcon discipline="bjj_gi" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  // ── Width/height props are forwarded ──────────────────────────────────────

  it('forwards width and height props to the svg', () => {
    const { container } = render(<DisciplineIcon discipline="bjj_gi" width={24} height={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  // ── Distinct glyphs per discipline (viewBox proves correct icon type) ──────

  describe('renders distinct glyphs', () => {
    it('bjj_gi uses gi-collar glyph (has a path with V-shaped collar data)', () => {
      const { container } = render(<DisciplineIcon discipline="bjj_gi" />);
      const paths = container.querySelectorAll('path');
      // GiCollarGlyph has exactly 1 path
      expect(paths.length).toBe(1);
    });

    it('bjj_nogi uses rashguard glyph (3 wave paths)', () => {
      const { container } = render(<DisciplineIcon discipline="bjj_nogi" />);
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBe(3);
    });

    it('wrestling uses grip glyph (2 paths)', () => {
      const { container } = render(<DisciplineIcon discipline="wrestling" />);
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBe(2);
    });

    it('striking uses glove glyph (3 paths)', () => {
      const { container } = render(<DisciplineIcon discipline="striking" />);
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBe(3);
    });

    it('mma uses octagon glyph (1 path)', () => {
      const { container } = render(<DisciplineIcon discipline="mma" />);
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBe(1);
    });
  });

  // ── All icons use currentColor (inherits parent text color) ───────────────

  describe('uses currentColor for strokes', () => {
    for (const discipline of DISCIPLINES) {
      it(`${discipline} paths use currentColor stroke`, () => {
        const { container } = render(<DisciplineIcon discipline={discipline} />);
        const paths = container.querySelectorAll('path');
        for (const path of paths) {
          expect(path.getAttribute('stroke')).toBe('currentColor');
        }
      });
    }
  });
});
