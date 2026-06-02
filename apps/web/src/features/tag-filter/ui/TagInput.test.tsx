// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TagInput } from '@/features/tag-filter/ui/TagInput';

// ---------------------------------------------------------------------------
// Tag chip rendering
// ---------------------------------------------------------------------------

describe('TagInput — renders selected tags as TagChips', () => {
  it('renders each selected tag as a chip with the tag name visible', () => {
    render(<TagInput value={['스윕', '암바']} onChange={vi.fn()} />);

    // TagChip renders a span with aria-label="태그 <name>"
    expect(screen.getByRole('generic', { name: '태그 스윕' }) ?? screen.getByLabelText('태그 스윕')).toBeInTheDocument();
    expect(screen.getByLabelText('태그 암바')).toBeInTheDocument();
  });

  it('renders a remove button inside each chip', () => {
    render(<TagInput value={['스윕']} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '태그 스윕 제거' })).toBeInTheDocument();
  });

  it('calls onChange without the removed tag when chip remove button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={['스윕', '암바']} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: '태그 스윕 제거' }));
    expect(onChange).toHaveBeenCalledWith(['암바']);
  });
});

// ---------------------------------------------------------------------------
// Combobox aria attributes
// ---------------------------------------------------------------------------

describe('TagInput — combobox aria attributes', () => {
  it('input has role="combobox"', () => {
    render(<TagInput value={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('aria-expanded is false when dropdown is closed', () => {
    render(<TagInput value={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('aria-expanded is true and aria-controls points to listbox when dropdown opens', async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        value={[]}
        onChange={vi.fn()}
        suggestions={['스윕', '암바']}
      />,
    );

    const input = screen.getByRole('combobox');
    await user.click(input);

    // Dropdown shows when there are suggestions and input is focused
    expect(input).toHaveAttribute('aria-expanded', 'true');

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-controls', listbox.id);
  });

  it('aria-controls always references the listbox id, even when dropdown is closed', () => {
    render(<TagInput value={[]} onChange={vi.fn()} />);
    const input = screen.getByRole('combobox');
    // Per ARIA 1.2, aria-controls must always point to the listbox popup
    const listboxId = input.getAttribute('aria-controls');
    expect(listboxId).toBeTruthy();
    // The listbox element must exist in the DOM (may be hidden when closed)
    const listbox = document.getElementById(listboxId!);
    expect(listbox).not.toBeNull();
    expect(listbox).toHaveAttribute('role', 'listbox');
  });
});

// ---------------------------------------------------------------------------
// Typing filters suggestions
// ---------------------------------------------------------------------------

describe('TagInput — typing filters suggestions', () => {
  it('shows all suggestions (not yet selected) on focus when query is empty', async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        value={[]}
        onChange={vi.fn()}
        suggestions={['스윕', '암바', '가드']}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(3);
  });

  it('filters suggestions by typed query (case-insensitive partial match)', async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        value={[]}
        onChange={vi.fn()}
        suggestions={['Sweep', 'Armbar', 'Guard']}
        allowCreate={false}
      />,
    );
    await user.type(screen.getByRole('combobox'), 'sw');
    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Sweep');
  });

  it('hides already-selected tags from suggestions', async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        value={['스윕']}
        onChange={vi.fn()}
        suggestions={['스윕', '암바']}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    // '스윕' is already selected so only '암바' should appear
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('암바');
  });

  it('each option item has role="option"', async () => {
    const user = userEvent.setup();
    render(
      <TagInput value={[]} onChange={vi.fn()} suggestions={['스윕']} />,
    );
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Keyboard: ArrowDown / ArrowUp navigation
// ---------------------------------------------------------------------------

describe('TagInput — ArrowDown/ArrowUp navigation', () => {
  it('ArrowDown moves active option down and updates aria-activedescendant', async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        value={[]}
        onChange={vi.fn()}
        suggestions={['스윕', '암바', '가드']}
      />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}');

    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    // First ArrowDown → activeIndex=0
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
  });

  it('ArrowDown wraps around to first option after last', async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        value={[]}
        onChange={vi.fn()}
        suggestions={['스윕', '암바']}
      />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    // 2 options: ArrowDown x3 → wraps: 0 → 1 → 0
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowUp moves active option up', async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        value={[]}
        onChange={vi.fn()}
        suggestions={['스윕', '암바', '가드']}
      />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}{ArrowDown}'); // activeIndex=1
    await user.keyboard('{ArrowUp}'); // activeIndex=0
    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('ArrowUp wraps around from first to last option', async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        value={[]}
        onChange={vi.fn()}
        suggestions={['스윕', '암바']}
      />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}'); // activeIndex=0
    await user.keyboard('{ArrowUp}'); // wraps to last (index=1)
    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('aria-activedescendant is absent when no option is active', async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        value={[]}
        onChange={vi.fn()}
        suggestions={['스윕', '암바']}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    // Dropdown open but no ArrowDown yet → activeIndex=-1
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-activedescendant');
  });
});

// ---------------------------------------------------------------------------
// Keyboard: Enter selects active option
// ---------------------------------------------------------------------------

describe('TagInput — Enter key selects active option', () => {
  it('Enter on active suggestion calls onChange with new array', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagInput
        value={[]}
        onChange={onChange}
        suggestions={['스윕', '암바']}
        allowCreate={false}
      />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}'); // active=스윕
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(['스윕']);
  });

  it('Enter without active option creates new tag when allowCreate=true', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagInput
        value={[]}
        onChange={onChange}
        suggestions={[]}
        allowCreate={true}
      />,
    );
    await user.type(screen.getByRole('combobox'), '레슬링');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(['레슬링']);
  });

  it('Enter clears the input query after adding', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <TagInput
        value={[]}
        onChange={onChange}
        suggestions={['스윕']}
        allowCreate={false}
      />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}');
    // After commit, query is cleared
    rerender(<TagInput value={['스윕']} onChange={onChange} suggestions={['스윕']} allowCreate={false} />);
    expect(input).toHaveValue('');
  });
});

// ---------------------------------------------------------------------------
// Keyboard: Escape closes dropdown
// ---------------------------------------------------------------------------

describe('TagInput — Escape closes dropdown', () => {
  it('Escape closes the dropdown', async () => {
    const user = userEvent.setup();
    render(
      <TagInput value={[]} onChange={vi.fn()} suggestions={['스윕']} />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('aria-expanded is false after Escape', async () => {
    const user = userEvent.setup();
    render(
      <TagInput value={[]} onChange={vi.fn()} suggestions={['스윕']} />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('Escape resets activeIndex (aria-activedescendant removed)', async () => {
    const user = userEvent.setup();
    render(
      <TagInput value={[]} onChange={vi.fn()} suggestions={['스윕']} />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Escape}');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });
});

// ---------------------------------------------------------------------------
// Keyboard: Backspace on empty input removes last tag
// ---------------------------------------------------------------------------

describe('TagInput — Backspace removes last tag', () => {
  it('Backspace on empty input calls onChange without the last tag', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagInput value={['스윕', '암바']} onChange={onChange} />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{Backspace}');
    expect(onChange).toHaveBeenCalledWith(['스윕']);
  });

  it('Backspace does NOT call onChange when input has text', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagInput value={['스윕']} onChange={onChange} />,
    );
    await user.type(screen.getByRole('combobox'), 'a{Backspace}');
    // The backspace here deletes typed 'a', not the chip — onChange not called for removal
    // onChange may or may not have been called for adding 'a' (it won't be since no Enter),
    // but it must NOT be called with [''] (chip-removal call)
    const chipRemovalCalls = onChange.mock.calls.filter(
      (call) => Array.isArray(call[0]) && call[0].length < 1,
    );
    expect(chipRemovalCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Comma key creates new tag (allowCreate=true)
// ---------------------------------------------------------------------------

describe('TagInput — Comma key creates new tag', () => {
  it('typing a comma commits the current input as a new tag when allowCreate=true', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagInput value={[]} onChange={onChange} allowCreate={true} suggestions={[]} />,
    );
    // userEvent.type treats ',' as a regular character but the onKeyDown handler
    // should intercept it before it lands in the input
    const input = screen.getByRole('combobox');
    await user.type(input, '클린치,');
    expect(onChange).toHaveBeenCalledWith(['클린치']);
  });

  it('comma does NOT create tag when allowCreate=false', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagInput value={[]} onChange={onChange} allowCreate={false} suggestions={['스윕']} />,
    );
    await user.type(screen.getByRole('combobox'), '스윕,');
    // onChange must not have been called (comma is swallowed but no commit)
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Duplicate prevention
// ---------------------------------------------------------------------------

describe('TagInput — duplicate prevention', () => {
  it('selecting a suggestion that already exists (case-insensitive) does not add duplicate', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // 'sweep' is already in value; 'Sweep' is in suggestions (but should be filtered out by filterSuggestions)
    render(
      <TagInput
        value={['sweep']}
        onChange={onChange}
        suggestions={['Sweep', 'Armbar']}
        allowCreate={false}
      />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    // 'Sweep' should NOT appear in the listbox since 'sweep' is already selected
    const listbox = screen.getByRole('listbox');
    const optionTexts = within(listbox)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(optionTexts.join(' ')).not.toMatch(/sweep/i);
    // Only 'Armbar' should be there
    expect(within(listbox).getAllByRole('option')).toHaveLength(1);
  });

  it('creating a tag that is already selected (case-insensitive) does not add duplicate', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagInput
        value={['SWEEP']}
        onChange={onChange}
        suggestions={[]}
        allowCreate={true}
      />,
    );
    await user.type(screen.getByRole('combobox'), 'sweep{Enter}');
    // addTag returns the same array → onChange called with the same array
    expect(onChange).toHaveBeenCalledWith(['SWEEP']);
  });

  it('entering an exact-match suggestion triggers no "create" option', async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        value={[]}
        onChange={vi.fn()}
        suggestions={['스윕']}
        allowCreate={true}
      />,
    );
    await user.type(screen.getByRole('combobox'), '스윕');
    const listbox = screen.queryByRole('listbox');
    if (listbox) {
      // If listbox is showing, none of the options should be a "create" option for '스윕'
      const options = within(listbox).getAllByRole('option');
      options.forEach((opt) => {
        // create option contains "+ 새 태그" text
        expect(opt.textContent).not.toContain('+ 새 태그');
      });
    }
    // If no listbox (no options at all), that's also valid since '스윕' is an exact match
  });
});

// ---------------------------------------------------------------------------
// max prop: input disabled when at max
// ---------------------------------------------------------------------------

describe('TagInput — max prop enforces limit', () => {
  it('input is disabled when value.length === max', () => {
    render(
      <TagInput value={['스윕', '암바']} onChange={vi.fn()} max={2} />,
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('input is enabled when value.length < max', () => {
    render(
      <TagInput value={['스윕']} onChange={vi.fn()} max={2} />,
    );
    expect(screen.getByRole('combobox')).not.toBeDisabled();
  });

  it('shows a max-limit message when at max', () => {
    render(
      <TagInput value={['스윕', '암바']} onChange={vi.fn()} max={2} />,
    );
    expect(screen.getByText(/최대 2개/)).toBeInTheDocument();
  });

  it('shows a max placeholder hint in the disabled input', () => {
    render(
      <TagInput value={['스윕', '암바']} onChange={vi.fn()} max={2} />,
    );
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'placeholder',
      '태그는 최대 2개까지',
    );
  });
});

// ---------------------------------------------------------------------------
// allowCreate — "새 태그" option
// ---------------------------------------------------------------------------

describe('TagInput — allowCreate option', () => {
  it('shows "새 태그" create option when allowCreate=true and no exact match', async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        value={[]}
        onChange={vi.fn()}
        suggestions={[]}
        allowCreate={true}
      />,
    );
    await user.type(screen.getByRole('combobox'), '신기술');
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByRole('option')).toHaveTextContent('+ 새 태그');
  });

  it('does NOT show "새 태그" option when allowCreate=false', async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        value={[]}
        onChange={vi.fn()}
        suggestions={['스윕']}
        allowCreate={false}
      />,
    );
    await user.type(screen.getByRole('combobox'), '신기술');
    // No match → no listbox, or listbox with no options
    const listbox = screen.queryByRole('listbox');
    if (listbox) {
      expect(within(listbox).queryByText(/새 태그/)).not.toBeInTheDocument();
    } else {
      // listbox absent is fine too
      expect(listbox).toBeNull();
    }
  });

  it('clicking the "새 태그" option calls onChange with the new tag', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagInput
        value={[]}
        onChange={onChange}
        suggestions={[]}
        allowCreate={true}
      />,
    );
    await user.type(screen.getByRole('combobox'), '신기술');
    const createOption = screen.getByRole('option');
    await user.pointer({ target: createOption, keys: '[MouseLeft>]' });
    expect(onChange).toHaveBeenCalledWith(['신기술']);
  });
});

// ---------------------------------------------------------------------------
// label prop
// ---------------------------------------------------------------------------

describe('TagInput — label prop', () => {
  it('renders visible label text when label prop is provided', () => {
    render(<TagInput value={[]} onChange={vi.fn()} label="태그 입력" />);
    expect(screen.getByText('태그 입력')).toBeInTheDocument();
  });

  it('input uses aria-labelledby pointing to label span when label is provided', () => {
    render(<TagInput value={[]} onChange={vi.fn()} label="태그 입력" />);
    const input = screen.getByRole('combobox');
    const labelledBy = input.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const labelEl = document.getElementById(labelledBy!);
    expect(labelEl).toHaveTextContent('태그 입력');
  });

  it('input has aria-label when no label prop is given', () => {
    render(<TagInput value={[]} onChange={vi.fn()} placeholder="태그 검색" />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-label', '태그 검색');
  });

  it('input defaults aria-label to "태그" when no label or placeholder', () => {
    render(<TagInput value={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', '태그');
  });
});
