// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock before importing the component under test
const openMock = vi.fn();

vi.mock('@/shared/model/session-editor-store', () => ({
  useSessionEditorStore: (selector: (s: { open: typeof openMock }) => unknown) =>
    selector({ open: openMock }),
}));

import { QuickAddFab } from '@/widgets/app-shell/QuickAddFab';

describe('QuickAddFab', () => {
  beforeEach(() => {
    openMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a button element', () => {
    render(<QuickAddFab />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has the accessible aria-label "세션 추가"', () => {
    render(<QuickAddFab />);
    expect(screen.getByRole('button', { name: '세션 추가' })).toBeInTheDocument();
  });

  it('has type="button"', () => {
    render(<QuickAddFab />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('has the fixed-position and rounded-full classes (FAB shape)', () => {
    render(<QuickAddFab />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('fixed');
    expect(btn).toHaveClass('rounded-full');
  });

  it('has the primary background color class (red FAB)', () => {
    render(<QuickAddFab />);
    expect(screen.getByRole('button')).toHaveClass('bg-[var(--primary)]');
  });

  it('clicking calls open with { mode: "create" }', async () => {
    const user = userEvent.setup();
    render(<QuickAddFab />);
    await user.click(screen.getByRole('button'));
    expect(openMock).toHaveBeenCalledTimes(1);
    expect(openMock).toHaveBeenCalledWith({ mode: 'create' });
  });

  it('does NOT pass a presetDate (host fills today)', async () => {
    const user = userEvent.setup();
    render(<QuickAddFab />);
    await user.click(screen.getByRole('button'));
    const callArg = openMock.mock.calls[0][0];
    expect(callArg).not.toHaveProperty('presetDate');
  });

  it('calls open exactly once per click', async () => {
    const user = userEvent.setup();
    render(<QuickAddFab />);
    const btn = screen.getByRole('button');
    await user.click(btn);
    await user.click(btn);
    expect(openMock).toHaveBeenCalledTimes(2);
  });
});
