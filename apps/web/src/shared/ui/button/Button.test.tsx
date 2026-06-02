// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/shared/ui/button/Button';

afterEach(cleanup);

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('defaults to type="button"', () => {
    render(<Button>Submit</Button>);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'button');
  });

  it('accepts explicit type="submit"', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit');
  });

  // --- variant classes ---
  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button', { name: 'Primary' });
    expect(btn).toHaveClass('bg-[var(--primary)]');
    expect(btn).toHaveClass('text-[var(--text-on-primary)]');
  });

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole('button', { name: 'Secondary' });
    expect(btn).toHaveClass('bg-[var(--surface-base)]');
    expect(btn).toHaveClass('border');
    expect(btn).toHaveClass('border-[var(--border-strong)]');
  });

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button', { name: 'Ghost' });
    expect(btn).toHaveClass('bg-transparent');
    expect(btn).toHaveClass('text-[var(--text-default)]');
  });

  // --- size classes ---
  it('applies sm size classes', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button', { name: 'Small' });
    expect(btn).toHaveClass('h-8');
    expect(btn).toHaveClass('px-2.5');
    expect(btn).toHaveClass('text-button-s');
    expect(btn).toHaveClass('rounded-xxs');
  });

  it('applies md size classes by default', () => {
    render(<Button>Medium</Button>);
    const btn = screen.getByRole('button', { name: 'Medium' });
    expect(btn).toHaveClass('h-10');
    expect(btn).toHaveClass('px-3.5');
    expect(btn).toHaveClass('text-button-m');
  });

  it('applies lg size classes', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole('button', { name: 'Large' });
    expect(btn).toHaveClass('h-12');
    expect(btn).toHaveClass('px-5');
    expect(btn).toHaveClass('text-button-l');
  });

  // --- block ---
  it('applies w-full when block=true', () => {
    render(<Button block>Block</Button>);
    expect(screen.getByRole('button', { name: 'Block' })).toHaveClass('w-full');
  });

  it('does not apply w-full when block is omitted', () => {
    render(<Button>Normal</Button>);
    expect(screen.getByRole('button', { name: 'Normal' })).not.toHaveClass('w-full');
  });

  // --- interactions ---
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await user.click(screen.getByRole('button', { name: 'Click' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Disabled</Button>);
    await user.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('merges extra className', () => {
    render(<Button className="custom-class">Styled</Button>);
    expect(screen.getByRole('button', { name: 'Styled' })).toHaveClass('custom-class');
  });
});
