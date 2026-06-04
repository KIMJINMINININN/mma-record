// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * SessionEditorForm — 폼 본체 로직(초기 상태·canSave·접이식·저장 분기) 검증.
 *
 * react-query/env/sonner 를 mock 해 hoisted 모노레포의 "Invalid hook call" 을 회피한다(TagManager 패턴).
 * logSession 은 mock 하되 logSessionInputSchema 는 실제로 둔다(safeParse 통과 경로까지 검증).
 * 무거운 자식(MediaPicker/TagInput/TechniquePicker)은 stub — DisciplinePicker/IntensityPicker 는
 * 실제 렌더해 종목 선택으로 canSave 를 실제 토글한다.
 */
const m = vi.hoisted(() => ({
  isAuthEnabled: vi.fn(() => true),
  logSession: vi.fn(),
  persistMediaDrafts: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  tagNames: [] as string[],
}));

vi.mock('@/shared/api/supabase/env', () => ({ isAuthEnabled: m.isAuthEnabled }));
vi.mock('sonner', () => ({ toast: m.toast }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ enabled }: { enabled?: boolean }) => ({ data: enabled ? m.tagNames : undefined }),
  useQueryClient: () => ({ invalidateQueries: m.invalidateQueries }),
}));
vi.mock('@/features/log-session', async () => {
  // 스키마(zod)만 실제 로드 — index/action 을 거치면 server-only 가 끌려와 클라 테스트에서 깨진다.
  const schema = await vi.importActual<
    typeof import('@/features/log-session/model/log-session-schema')
  >('@/features/log-session/model/log-session-schema');
  return { logSessionInputSchema: schema.logSessionInputSchema, logSession: m.logSession };
});
vi.mock('@/features/media-upload', () => ({
  persistMediaDrafts: m.persistMediaDrafts,
  MediaPicker: () => null,
}));
vi.mock('@/features/tag-filter', () => ({ TagInput: () => null }));
vi.mock('./TechniquePicker', () => ({ TechniquePicker: () => null }));

import { SessionEditorForm } from './SessionEditorForm';
import { DISCIPLINE_META } from '@/entities/discipline';

function renderForm(onDone: () => void = vi.fn()) {
  render(
    <SessionEditorForm initialDate="2026-06-04" mode="create" sessionId={null} onDone={onDone} />,
  );
  return { onDone };
}

beforeEach(() => {
  m.isAuthEnabled.mockReturnValue(true);
  m.logSession.mockReset();
  m.logSession.mockResolvedValue({ ok: true });
  m.persistMediaDrafts.mockReset();
  m.persistMediaDrafts.mockResolvedValue([]);
  m.invalidateQueries.mockClear();
  m.toast.success.mockClear();
  m.toast.error.mockClear();
  m.toast.info.mockClear();
  m.tagNames = [];
});

afterEach(cleanup);

describe('SessionEditorForm', () => {
  it('초기: 날짜 input = initialDate', () => {
    renderForm();
    expect(screen.getByLabelText('날짜')).toHaveValue('2026-06-04');
  });

  it('초기: 종목 0개 → 안내 + 저장 비활성', () => {
    renderForm();
    expect(screen.getByText('종목을 1개 이상 선택하세요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
  });

  it('종목 선택 → 저장 활성 + 안내 사라짐', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: DISCIPLINE_META.mma.label }));
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
    expect(screen.queryByText('종목을 1개 이상 선택하세요.')).not.toBeInTheDocument();
  });

  it('세부 정보 접이식 토글(aria-expanded + 필드 노출)', async () => {
    const user = userEvent.setup();
    renderForm();
    const toggle = screen.getByRole('button', { name: /세부 정보/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('체육관')).not.toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('체육관')).toBeInTheDocument();
  });

  it('저장 성공 → logSession 호출 + 성공 토스트 + onDone + invalidate(calendar/tags)', async () => {
    const user = userEvent.setup();
    const { onDone } = renderForm();
    await user.click(screen.getByRole('button', { name: DISCIPLINE_META.bjj_nogi.label }));
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(m.logSession).toHaveBeenCalled());
    expect(m.logSession).toHaveBeenCalledWith(
      expect.objectContaining({
        trained_on: '2026-06-04',
        disciplines: ['bjj_nogi'],
        techniques: [], // RPC seam 계약: 영속화 전 빈 배열 유지
        media: [],
      }),
    );
    expect(m.toast.success).toHaveBeenCalledWith('저장됨');
    expect(onDone).toHaveBeenCalled();
    expect(m.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['calendar'] });
    expect(m.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tags'] });
  });

  it('dormant 응답 → info 토스트, onDone 미호출(셸 탐색 유지)', async () => {
    m.logSession.mockResolvedValue({ ok: false, dormant: true, error: '로그인 후 저장할 수 있어요' });
    const user = userEvent.setup();
    const { onDone } = renderForm();
    await user.click(screen.getByRole('button', { name: DISCIPLINE_META.mma.label }));
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(m.toast.info).toHaveBeenCalledWith('로그인 후 저장할 수 있어요'));
    expect(onDone).not.toHaveBeenCalled();
    expect(m.toast.success).not.toHaveBeenCalled();
    expect(m.invalidateQueries).not.toHaveBeenCalled(); // 성공 경로만 무효화
  });

  it('error 응답 → error 토스트', async () => {
    m.logSession.mockResolvedValue({ ok: false, dormant: false, error: '저장 실패' });
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: DISCIPLINE_META.mma.label }));
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(m.toast.error).toHaveBeenCalledWith('저장 실패'));
  });
});
