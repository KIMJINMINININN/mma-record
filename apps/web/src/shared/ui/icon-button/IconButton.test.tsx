// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconButton } from '@/shared/ui/icon-button/IconButton';

afterEach(cleanup);

describe('IconButton', () => {
  it('renders with accessible name via aria-label', () => {
    render(<IconButton aria-label="Close">X</IconButton>);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<IconButton aria-label="Menu">☰</IconButton>);
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveTextContent('☰');
  });

  // --- size classes ---
  it('applies sm size class', () => {
    render(<IconButton aria-label="Small" size="sm">X</IconButton>);
    const btn = screen.getByRole('button', { name: 'Small' });
    expect(btn).toHaveClass('size-8');
    expect(btn).toHaveClass('rounded-xxs');
  });

  it('applies md size class by default', () => {
    render(<IconButton aria-label="Medium">X</IconButton>);
    expect(screen.getByRole('button', { name: 'Medium' })).toHaveClass('size-10');
  });

  it('applies lg size class', () => {
    render(<IconButton aria-label="Large" size="lg">X</IconButton>);
    expect(screen.getByRole('button', { name: 'Large' })).toHaveClass('size-11');
  });

  // --- variant classes ---
  it('applies ghost variant by default', () => {
    render(<IconButton aria-label="Ghost">X</IconButton>);
    expect(screen.getByRole('button', { name: 'Ghost' })).toHaveClass('bg-transparent');
  });

  it('applies solid variant classes', () => {
    render(<IconButton aria-label="Solid" variant="solid">X</IconButton>);
    const btn = screen.getByRole('button', { name: 'Solid' });
    expect(btn).toHaveClass('bg-[var(--surface-raised)]');
    expect(btn).toHaveClass('border');
    expect(btn).toHaveClass('border-[var(--border-default)]');
  });

  // --- interactions ---
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton aria-label="Action" onClick={onClick}>X</IconButton>);
    await user.click(screen.getByRole('button', { name: 'Action' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton aria-label="Disabled" disabled onClick={onClick}>X</IconButton>);
    await user.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('defaults to type="button"', () => {
    render(<IconButton aria-label="Type">X</IconButton>);
    expect(screen.getByRole('button', { name: 'Type' })).toHaveAttribute('type', 'button');
  });

  it('merges extra className', () => {
    render(<IconButton aria-label="Styled" className="my-class">X</IconButton>);
    expect(screen.getByRole('button', { name: 'Styled' })).toHaveClass('my-class');
  });
});
