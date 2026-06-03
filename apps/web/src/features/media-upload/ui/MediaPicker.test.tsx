// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import { MediaPicker } from './MediaPicker';
import type { MediaDraft } from '../model/media-draft';

afterEach(cleanup);

function setup(value: MediaDraft[] = []) {
  const onChange = vi.fn();
  render(<MediaPicker value={value} onChange={onChange} />);
  return { onChange, input: screen.getByLabelText('유튜브 또는 외부 링크') };
}

describe('MediaPicker link auto-routing (F5)', () => {
  it('유튜브 URL → youtube 초안', async () => {
    const user = userEvent.setup();
    const { onChange, input } = setup();
    await user.type(input, 'https://youtu.be/dQw4w9WgXcQ');
    await user.click(screen.getByRole('button', { name: '추가' }));
    expect(onChange).toHaveBeenCalledWith([{ kind: 'youtube', videoId: 'dQw4w9WgXcQ' }]);
  });

  it('일반 http(s) URL → external 초안(안전화)', async () => {
    const user = userEvent.setup();
    const { onChange, input } = setup();
    await user.type(input, 'https://example.com/drill');
    await user.click(screen.getByRole('button', { name: '추가' }));
    expect(onChange).toHaveBeenCalledWith([
      { kind: 'external', url: 'https://example.com/drill', title: null },
    ]);
  });

  it('유튜브도 http(s)도 아니면 에러 + onChange 미호출', async () => {
    const user = userEvent.setup();
    const { onChange, input } = setup();
    await user.type(input, 'not a url');
    await user.click(screen.getByRole('button', { name: '추가' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/http\(s\) URL을 입력하세요/)).toBeInTheDocument();
  });

  it('javascript: 스킴은 external로 통과하지 않음(에러)', async () => {
    const user = userEvent.setup();
    const { onChange, input } = setup();
    await user.type(input, 'javascript:alert(1)');
    await user.click(screen.getByRole('button', { name: '추가' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
