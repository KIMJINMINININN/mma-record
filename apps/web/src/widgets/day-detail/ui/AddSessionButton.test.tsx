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

import { AddSessionButton } from '@/widgets/day-detail/ui/AddSessionButton';

describe('AddSessionButton', () => {
  beforeEach(() => {
    openMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a button with the default label "세션 추가"', () => {
    render(<AddSessionButton date={new Date('2025-03-15')} />);
    expect(screen.getByRole('button', { name: /세션 추가/ })).toBeInTheDocument();
  });

  it('renders a button with a custom label when provided', () => {
    render(<AddSessionButton date={new Date('2025-03-15')} label="운동 추가" />);
    expect(screen.getByRole('button', { name: /운동 추가/ })).toBeInTheDocument();
  });

  it('clicking calls open with mode "create" and the correct YYYY-MM-DD presetDate', async () => {
    const user = userEvent.setup();
    render(<AddSessionButton date={new Date('2025-03-15')} />);
    await user.click(screen.getByRole('button'));
    expect(openMock).toHaveBeenCalledTimes(1);
    expect(openMock).toHaveBeenCalledWith({ mode: 'create', presetDate: '2025-03-15' });
  });

  it('formats the presetDate to YYYY-MM-DD regardless of the Date constructor format', async () => {
    const user = userEvent.setup();
    // Date object constructed differently — should still serialize to ISO date string
    render(<AddSessionButton date={new Date(2024, 0, 7)} />); // January 7, 2024
    await user.click(screen.getByRole('button'));
    expect(openMock).toHaveBeenCalledWith({ mode: 'create', presetDate: '2024-01-07' });
  });

  it('passes the variant prop down to the underlying button (secondary)', () => {
    render(<AddSessionButton date={new Date('2025-06-01')} variant="secondary" />);
    const btn = screen.getByRole('button');
    // secondary variant applies a specific class from Button's cva definition
    expect(btn).toHaveClass('bg-[var(--surface-base)]');
  });

  it('passes the primary variant by default', () => {
    render(<AddSessionButton date={new Date('2025-06-01')} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('bg-[var(--primary)]');
  });

  it('passes the size prop to the button (sm)', () => {
    render(<AddSessionButton date={new Date('2025-06-01')} size="sm" />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('h-8');
  });

  it('calls open exactly once per click', async () => {
    const user = userEvent.setup();
    render(<AddSessionButton date={new Date('2025-06-01')} />);
    const btn = screen.getByRole('button');
    await user.click(btn);
    await user.click(btn);
    expect(openMock).toHaveBeenCalledTimes(2);
  });
});
