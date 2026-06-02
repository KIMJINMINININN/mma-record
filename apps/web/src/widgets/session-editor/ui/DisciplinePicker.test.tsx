// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

afterEach(cleanup);
import { DISCIPLINES } from '@/shared/model/enums';
import { DISCIPLINE_META } from '@/entities/discipline';
import { DisciplinePicker } from '@/widgets/session-editor/ui/DisciplinePicker';

/** Helper: get the button wrapping the chip for a given discipline. */
function getDisciplineButton(discipline: (typeof DISCIPLINES)[number]) {
  const label = DISCIPLINE_META[discipline].label;
  // The button wraps a span[role=img][aria-label=label]; RTL derives the
  // button's accessible name from that child img element.
  return screen.getByRole('button', { name: label });
}

describe('DisciplinePicker', () => {
  // --- Rendering ---

  it('renders exactly 5 buttons', () => {
    render(<DisciplinePicker value={[]} onChange={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('renders buttons in DISCIPLINES order', () => {
    render(<DisciplinePicker value={[]} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn, i) => {
      expect(btn).toHaveAttribute('aria-pressed', 'false');
      // verify label matches DISCIPLINES[i] in order
      const expectedLabel = DISCIPLINE_META[DISCIPLINES[i]].label;
      expect(btn).toHaveAccessibleName(expectedLabel);
    });
  });

  it('buttons are all type="button" (not submit)', () => {
    render(<DisciplinePicker value={[]} onChange={vi.fn()} />);
    screen.getAllByRole('button').forEach((btn) => {
      expect(btn).toHaveAttribute('type', 'button');
    });
  });

  // --- aria-pressed reflects selection ---

  it('selected disciplines have aria-pressed=true, others false', () => {
    render(<DisciplinePicker value={['bjj_gi', 'mma']} onChange={vi.fn()} />);
    for (const d of DISCIPLINES) {
      const selected = d === 'bjj_gi' || d === 'mma';
      expect(getDisciplineButton(d)).toHaveAttribute(
        'aria-pressed',
        selected ? 'true' : 'false',
      );
    }
  });

  it('all buttons show aria-pressed=false when value is empty', () => {
    render(<DisciplinePicker value={[]} onChange={vi.fn()} />);
    DISCIPLINES.forEach((d) => {
      expect(getDisciplineButton(d)).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('all buttons show aria-pressed=true when all disciplines selected', () => {
    render(<DisciplinePicker value={[...DISCIPLINES]} onChange={vi.fn()} />);
    DISCIPLINES.forEach((d) => {
      expect(getDisciplineButton(d)).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // --- Adding: clicking an unselected discipline ---

  it('clicking an unselected discipline calls onChange with it added', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DisciplinePicker value={['bjj_gi']} onChange={onChange} />);
    await user.click(getDisciplineButton('wrestling'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next: string[] = onChange.mock.calls[0][0];
    expect(next).toContain('bjj_gi');
    expect(next).toContain('wrestling');
  });

  it('clicking unselected when value=[] calls onChange([discipline])', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DisciplinePicker value={[]} onChange={onChange} />);
    await user.click(getDisciplineButton('mma'));
    expect(onChange).toHaveBeenCalledWith(['mma']);
  });

  it('does not duplicate an already-selected discipline when adding another', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DisciplinePicker value={['striking']} onChange={onChange} />);
    await user.click(getDisciplineButton('bjj_nogi'));
    const next: string[] = onChange.mock.calls[0][0];
    // 'striking' appears exactly once
    expect(next.filter((x) => x === 'striking')).toHaveLength(1);
    expect(next).toContain('bjj_nogi');
  });

  // --- Removing: clicking a selected discipline ---

  it('clicking a selected discipline calls onChange with it removed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DisciplinePicker value={['bjj_gi', 'wrestling']} onChange={onChange} />);
    await user.click(getDisciplineButton('bjj_gi'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next: string[] = onChange.mock.calls[0][0];
    expect(next).not.toContain('bjj_gi');
    expect(next).toContain('wrestling');
  });

  it('clicking the only selected discipline calls onChange([])', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DisciplinePicker value={['mma']} onChange={onChange} />);
    await user.click(getDisciplineButton('mma'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
