// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DisciplineChip } from '@/entities/discipline/ui/DisciplineChip';
import { DISCIPLINE_META } from '@/entities/discipline/lib/discipline-meta';
import type { Discipline } from '@/shared/model/enums';

afterEach(cleanup);

const DISCIPLINES: Discipline[] = ['bjj_gi', 'bjj_nogi', 'wrestling', 'striking', 'mma'];

describe('DisciplineChip', () => {
  // ── TRIPLE-ENCODING: color + glyph/shape + TEXT label ────────────────────
  //
  // Design §6.2 / F9-AC2 / F9-AC4 requirement:
  //   "색 + 아이콘 + 한글 라벨 3중 인코딩. 색만으로 식별하지 않는다."
  //
  // We assert that BOTH a glyph (svg present) AND a text/aria label exist.

  describe('triple-encoding: glyph + text label', () => {
    for (const discipline of DISCIPLINES) {
      it(`${discipline}: renders an svg glyph AND visible text label`, () => {
        const meta = DISCIPLINE_META[discipline];
        const { container } = render(<DisciplineChip discipline={discipline} />);

        // GLYPH: SVG must be present (shape encoding)
        expect(container.querySelector('svg')).not.toBeNull();

        // TEXT: visible text label must be present (text encoding)
        expect(container.querySelector('.truncate')!.textContent).toBe(meta.label);
      });
    }

    it('bjj_gi: chip has role=img + aria-label (accessible label encoding)', () => {
      const { container } = render(<DisciplineChip discipline="bjj_gi" />);
      const chip = container.querySelector('[role="img"]');
      expect(chip).not.toBeNull();
      expect(chip).toHaveAttribute('aria-label', '주짓수 (기)');
    });

    it('bjj_gi: has title attribute for tooltip-level label', () => {
      const { container } = render(<DisciplineChip discipline="bjj_gi" />);
      const chip = container.querySelector('[role="img"]');
      expect(chip).toHaveAttribute('title', '주짓수 (기)');
    });
  });

  // ── DOT SIZE: labelled dot with aria-label/title ──────────────────────────

  describe('dot size', () => {
    it('renders a span with role=img, aria-label, and sr-only text label (color-blind robustness)', () => {
      const { container } = render(<DisciplineChip discipline="bjj_gi" size="dot" />);
      const dot = container.querySelector('[role="img"]');
      expect(dot).not.toBeNull();
      expect(dot).toHaveAttribute('aria-label', '주짓수 (기)');
      // sr-only span must be in the DOM so the label is always present, not only via aria-label
      const srOnly = dot!.querySelector('.sr-only');
      expect(srOnly).not.toBeNull();
      expect(srOnly!.textContent).toBe('주짓수 (기)');
    });

    it('dot has title attribute', () => {
      const { container } = render(<DisciplineChip discipline="bjj_gi" size="dot" />);
      const dot = container.querySelector('[role="img"]');
      expect(dot).toHaveAttribute('title', '주짓수 (기)');
    });

    it('dot does NOT render a nested svg glyph (dot is color-only with aria-label supplement)', () => {
      const { container } = render(<DisciplineChip discipline="bjj_gi" size="dot" />);
      // dot variant has no DisciplineIcon SVG — the aria-label/title compensates
      expect(container.querySelector('svg')).toBeNull();
    });

    it('dot does NOT render a .truncate visible text label (label is sr-only, not a visible chip label)', () => {
      const { container } = render(<DisciplineChip discipline="bjj_gi" size="dot" />);
      expect(container.querySelector('.truncate')).toBeNull();
    });

    it('renders for each discipline as dot', () => {
      for (const discipline of DISCIPLINES) {
        const meta = DISCIPLINE_META[discipline];
        const { container, unmount } = render(<DisciplineChip discipline={discipline} size="dot" />);
        const dot = container.querySelector('[role="img"]');
        expect(dot).toHaveAttribute('aria-label', meta.label);
        unmount();
      }
    });
  });

  // ── XS SIZE ───────────────────────────────────────────────────────────────

  describe('xs size', () => {
    it('renders DisciplineIcon svg AND text label', () => {
      const { container } = render(<DisciplineChip discipline="bjj_gi" size="xs" />);
      expect(container.querySelector('svg')).not.toBeNull();
      expect(container.querySelector('.truncate')!.textContent).toBe('주짓수 (기)');
    });

    it('icon size is 12 (width attr on svg)', () => {
      const { container } = render(<DisciplineChip discipline="bjj_gi" size="xs" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '12');
      expect(svg).toHaveAttribute('height', '12');
    });
  });

  // ── SM SIZE ───────────────────────────────────────────────────────────────

  describe('sm size (default)', () => {
    it('renders DisciplineIcon svg AND text label', () => {
      const { container } = render(<DisciplineChip discipline="striking" />);
      expect(container.querySelector('svg')).not.toBeNull();
      expect(container.querySelector('.truncate')!.textContent).toBe('타격');
    });

    it('icon size is 14 (width attr on svg)', () => {
      const { container } = render(<DisciplineChip discipline="striking" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '14');
      expect(svg).toHaveAttribute('height', '14');
    });
  });

  // ── SELECTED STATE ────────────────────────────────────────────────────────

  describe('selected state', () => {
    it('non-selected chip uses tint background style', () => {
      const { container } = render(<DisciplineChip discipline="bjj_gi" selected={false} />);
      const chip = container.querySelector('[role="img"]') as HTMLElement;
      // tint background uses color-mix(…)
      expect(chip.style.backgroundColor).toContain('color-mix');
    });

    it('selected chip uses solid fill background style', () => {
      const { container } = render(<DisciplineChip discipline="bjj_gi" selected />);
      const chip = container.querySelector('[role="img"]') as HTMLElement;
      // selected fill uses light-dark(…)
      expect(chip.style.backgroundColor).toContain('light-dark');
    });

    it('selected chip still renders both glyph and text (triple encoding preserved)', () => {
      const { container } = render(<DisciplineChip discipline="bjj_gi" selected />);
      expect(container.querySelector('svg')).not.toBeNull();
      expect(container.querySelector('.truncate')!.textContent).toBe('주짓수 (기)');
    });
  });

  // ── ARIA-LABEL FOR EACH DISCIPLINE ────────────────────────────────────────

  describe('aria-label matches discipline label', () => {
    for (const discipline of DISCIPLINES) {
      it(`${discipline} aria-label = "${DISCIPLINE_META[discipline].label}"`, () => {
        const { container } = render(<DisciplineChip discipline={discipline} />);
        const chip = container.querySelector('[role="img"]');
        expect(chip).toHaveAttribute('aria-label', DISCIPLINE_META[discipline].label);
      });
    }
  });

  // ── NOTE ──────────────────────────────────────────────────────────────────
  // dot size: uses aria-label + title + sr-only text for accessible label, no SVG glyph.
  // The dot is a pure-color circle (backgroundColor: disc).
  // Color-blind robustness: sr-only <span> ensures the label is always in the DOM,
  // not only via aria-label (which AT exposes) or title (tooltip, hover/focus only).
});
