// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import { Callout } from '@/shared/ui/callout/Callout';

afterEach(cleanup);

describe('Callout', () => {
  // --- rendering ---
  it('renders the title text', () => {
    render(<Callout title="Warning">Body text</Callout>);
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<Callout title="Note">Important content</Callout>);
    expect(screen.getByText('Important content')).toBeInTheDocument();
  });

  // --- default variant (danger) ---
  it('defaults to danger variant — applies border-[var(--primary)] and bg-[var(--primary-soft)]', () => {
    const { container } = render(<Callout title="Danger">Body</Callout>);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('border-[var(--primary)]');
    expect(root).toHaveClass('bg-[var(--primary-soft)]');
  });

  it('danger variant applies text-[var(--danger)] on the header', () => {
    render(<Callout title="Watch out">Body</Callout>);
    const header = screen.getByText('Watch out');
    expect(header).toHaveClass('text-[var(--danger)]');
  });

  it('danger variant shows the default ⚠ icon wrapped in aria-hidden span', () => {
    const { container } = render(<Callout title="Danger">Body</Callout>);
    // The ⚠ character is rendered inside an aria-hidden span — use within(container)
    // to scope the query to this render only.
    const iconSpan = within(container).getByText('⚠');
    expect(iconSpan.tagName).toBe('SPAN');
    expect(iconSpan).toHaveAttribute('aria-hidden', 'true');
  });

  // --- info variant ---
  it('info variant applies border-[var(--border-strong)] and bg-[var(--surface-sunken)]', () => {
    const { container } = render(
      <Callout variant="info" title="Info">Body</Callout>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('border-[var(--border-strong)]');
    expect(root).toHaveClass('bg-[var(--surface-sunken)]');
  });

  it('info variant applies text-[var(--text-default)] on the header', () => {
    render(<Callout variant="info" title="Info title">Body</Callout>);
    const header = screen.getByText('Info title');
    expect(header).toHaveClass('text-[var(--text-default)]');
  });

  it('info variant has no default icon (null by default)', () => {
    const { container } = render(
      <Callout variant="info" title="Info">Body</Callout>,
    );
    // No ⚠ in this render
    expect(within(container).queryByText('⚠')).not.toBeInTheDocument();
    // No aria-hidden span in this render
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  // --- custom icon ---
  it('renders custom icon in an aria-hidden span', () => {
    const { container } = render(<Callout title="Custom" icon="★">Body</Callout>);
    const iconSpan = within(container).getByText('★');
    expect(iconSpan).toHaveAttribute('aria-hidden', 'true');
  });

  // --- shared structure classes ---
  it('has border-l-4 and p-4 on the root regardless of variant', () => {
    const { container } = render(<Callout title="T">B</Callout>);
    expect(container.firstChild).toHaveClass('border-l-4');
    expect(container.firstChild).toHaveClass('p-4');
  });

  it('merges extra className onto the root element', () => {
    const { container } = render(
      <Callout title="T" className="my-callout">B</Callout>,
    );
    expect(container.firstChild).toHaveClass('my-callout');
  });
});
