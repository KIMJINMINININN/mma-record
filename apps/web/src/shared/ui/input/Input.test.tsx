// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/shared/ui/input/Input';

afterEach(cleanup);

describe('Input', () => {
  it('label is associated with the input (getByLabelText)', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('label text is rendered', () => {
    render(<Input label="Username" />);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('renders an input element', () => {
    render(<Input label="Name" />);
    const input = screen.getByLabelText('Name');
    expect(input.tagName).toBe('INPUT');
  });

  it('forwards type prop to the input element', () => {
    render(<Input label="Password" type="password" />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('forwards placeholder prop to the input element', () => {
    render(<Input label="Search" placeholder="Search..." />);
    expect(screen.getByLabelText('Search')).toHaveAttribute('placeholder', 'Search...');
  });

  it('accepts typing and reflects value via userEvent', async () => {
    const user = userEvent.setup();
    render(<Input label="Username" />);
    const input = screen.getByLabelText('Username');
    await user.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });

  it('uses a stable explicit id when provided (label remains associated)', () => {
    render(<Input label="City" id="city-input" />);
    const input = screen.getByLabelText('City');
    expect(input).toHaveAttribute('id', 'city-input');
    const label = screen.getByText('City') as HTMLLabelElement;
    expect(label).toHaveAttribute('for', 'city-input');
  });

  it('auto-generates id when none is supplied (label still works)', () => {
    render(<Input label="Auto ID" />);
    const input = screen.getByLabelText('Auto ID');
    const label = screen.getByText('Auto ID') as HTMLLabelElement;
    expect(label).toHaveAttribute('for', input.id);
    expect(input.id).not.toBe('');
  });

  it('forwards disabled prop', () => {
    render(<Input label="Disabled field" disabled />);
    expect(screen.getByLabelText('Disabled field')).toBeDisabled();
  });

  it('merges extra className onto the input element', () => {
    render(<Input label="Styled" className="border-red-500" />);
    expect(screen.getByLabelText('Styled')).toHaveClass('border-red-500');
  });

  it('applies wrapperClassName onto the wrapper div', () => {
    const { container } = render(<Input label="Wrapped" wrapperClassName="my-wrapper" />);
    expect(container.firstChild).toHaveClass('my-wrapper');
  });
});
