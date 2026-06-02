// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

afterEach(cleanup);
import { IntensityPicker } from '@/widgets/session-editor/ui/IntensityPicker';

describe('IntensityPicker', () => {
  // --- Rendering ---

  it('renders exactly 5 buttons', () => {
    render(<IntensityPicker value={null} onChange={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('renders buttons with aria-label "강도 N" for N=1..5', () => {
    render(<IntensityPicker value={null} onChange={vi.fn()} />);
    for (let n = 1; n <= 5; n++) {
      expect(screen.getByRole('button', { name: `강도 ${n}` })).toBeInTheDocument();
    }
  });

  it('wraps buttons in a group with aria-label "강도"', () => {
    render(<IntensityPicker value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('group', { name: '강도' })).toBeInTheDocument();
  });

  // --- aria-pressed ---

  it('all buttons have aria-pressed=false when value is null', () => {
    render(<IntensityPicker value={null} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toHaveAttribute('aria-pressed', 'false'));
  });

  it('only the button matching value has aria-pressed=true', () => {
    render(<IntensityPicker value={3} onChange={vi.fn()} />);
    for (let n = 1; n <= 5; n++) {
      const btn = screen.getByRole('button', { name: `강도 ${n}` });
      expect(btn).toHaveAttribute('aria-pressed', n === 3 ? 'true' : 'false');
    }
  });

  // --- "N / 5" label ---

  it('does not render the "N / 5" label when value is null', () => {
    render(<IntensityPicker value={null} onChange={vi.fn()} />);
    expect(screen.queryByText(/\/\s*5/)).not.toBeInTheDocument();
  });

  it('renders "2 / 5" label when value=2', () => {
    render(<IntensityPicker value={2} onChange={vi.fn()} />);
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('renders "5 / 5" label when value=5', () => {
    render(<IntensityPicker value={5} onChange={vi.fn()} />);
    expect(screen.getByText('5 / 5')).toBeInTheDocument();
  });

  // --- onChange interactions ---

  it('clicking dot N calls onChange(N) when no value is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<IntensityPicker value={null} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '강도 3' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('clicking dot N calls onChange(N) when a different value is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<IntensityPicker value={2} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '강도 4' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('clicking the currently-selected dot calls onChange(null) — toggle-to-clear', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<IntensityPicker value={3} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '강도 3' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('clicking dot 1 when value=1 clears to null', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<IntensityPicker value={1} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '강도 1' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('clicking dot 5 when value=5 clears to null', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<IntensityPicker value={5} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '강도 5' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
