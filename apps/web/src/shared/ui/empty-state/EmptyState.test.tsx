// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EmptyState } from '@/shared/ui/empty-state/EmptyState';

afterEach(cleanup);

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="Nothing here yet" />);
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });

  it('title is rendered as a <p> element (text-heading-xs)', () => {
    render(<EmptyState title="No sessions" />);
    // Source uses <p> (not heading element) for the title
    const titleEl = screen.getByText('No sessions');
    expect(titleEl.tagName).toBe('P');
    expect(titleEl).toHaveClass('text-heading-xs');
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Add your first record" />);
    expect(screen.getByText('Add your first record')).toBeInTheDocument();
  });

  it('does not render description element when omitted', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const paras = container.querySelectorAll('p.text-body-s-400');
    expect(paras).toHaveLength(0);
  });

  it('renders action node when provided', () => {
    render(<EmptyState title="Empty" action={<button>Add</button>} />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('does not render action wrapper when action omitted', () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelector('.mt-3')).toBeNull();
  });

  it('icon wrapper has aria-hidden="true"', () => {
    render(<EmptyState title="Empty" icon={<svg data-testid="icon" />} />);
    const iconWrapper = screen.getByTestId('icon').parentElement;
    expect(iconWrapper).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not render icon wrapper when icon is omitted', () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('merges extra className onto the root div', () => {
    const { container } = render(<EmptyState title="Empty" className="custom-empty" />);
    expect(container.firstChild).toHaveClass('custom-empty');
  });
});
