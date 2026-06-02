// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Skeleton } from '@/shared/ui/skeleton/Skeleton';

afterEach(cleanup);

describe('Skeleton', () => {
  it('has aria-hidden="true" (hidden from assistive tech)', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('has the shimmer animate class "animate-skeleton"', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-skeleton');
  });

  it('has bg-[length:200%_100%] for the shimmer gradient sizing', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('bg-[length:200%_100%]');
  });

  it('has rounded-xs class', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('rounded-xs');
  });

  it('merges extra className', () => {
    const { container } = render(<Skeleton className="h-4 w-full" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('h-4');
    expect(el).toHaveClass('w-full');
  });
});
