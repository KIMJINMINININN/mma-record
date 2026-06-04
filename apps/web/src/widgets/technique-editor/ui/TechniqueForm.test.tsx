// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * TechniqueForm — 적응형 폼 검증(조건부 필드 belt↔level↔striking · 종목 변경 리셋 ·
 * create/edit 분기 · prefill).
 *
 * react-query/env/sonner/router 를 mock 해 hoisted 모노레포의 "Invalid hook call" 을 회피한다.
 * useQuery 는 queryKey 로 분기(tags suggestions / edit prefill: technique·tags·media).
 * createTechnique/updateTechnique(server action) 는 mock, techniqueInsertSchema 는 실제(safeParse 경로).
 * 무거운 자식(MediaPicker/TagInput)은 stub — discipline/category select 와 미리보기 chip 은 실제 렌더.
 */
const m = vi.hoisted(() => ({
  isAuthEnabled: vi.fn(() => true),
  createTechnique: vi.fn(),
  updateTechnique: vi.fn(),
  persistMediaDrafts: vi.fn(),
  invalidateQueries: vi.fn(),
  routerPush: vi.fn(),
  routerBack: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  tagNames: [] as string[],
  existing: undefined as Record<string, unknown> | undefined,
  existingTagNames: undefined as string[] | undefined,
  existingMedia: undefined as Array<Record<string, unknown>> | undefined,
}));

vi.mock('@/shared/api/supabase/env', () => ({ isAuthEnabled: m.isAuthEnabled }));
vi.mock('sonner', () => ({ toast: m.toast }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: m.routerPush, back: m.routerBack }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey, enabled }: { queryKey: unknown[]; enabled?: boolean }) => {
    if (!enabled) return { data: undefined };
    if (queryKey[0] === 'tags') return { data: m.tagNames };
    if (queryKey[0] === 'technique') {
      const sub = queryKey[2];
      if (sub === 'tags') return { data: m.existingTagNames };
      if (sub === 'media') return { data: m.existingMedia };
      return { data: m.existing };
    }
    return { data: undefined };
  },
  useQueryClient: () => ({ invalidateQueries: m.invalidateQueries }),
}));
vi.mock('@/features/edit-technique', () => ({
  createTechnique: m.createTechnique,
  updateTechnique: m.updateTechnique,
}));
vi.mock('@/features/media-upload', () => ({
  persistMediaDrafts: m.persistMediaDrafts,
  MediaPicker: () => null,
}));
vi.mock('@/features/tag-filter', () => ({ TagInput: () => null }));

import { TechniqueForm } from './TechniqueForm';

function makeTech(over: Record<string, unknown> = {}) {
  return {
    id: 't1',
    user_id: 'u',
    name: '베림볼로',
    discipline: 'bjj_nogi',
    category: 'submission',
    position: null,
    belt: null,
    belt_stripes: null,
    striking_style: null,
    level: null,
    description_md: null,
    details_md: null,
    is_favorite: false,
    visibility: 'private',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

/** 분류 select 의 첫 비어있지 않은 옵션을 선택(종목별 카테고리 목록에 의존하지 않는다). */
async function selectFirstCategory(user: ReturnType<typeof userEvent.setup>) {
  const catSelect = screen.getByLabelText('분류');
  const opts = within(catSelect)
    .getAllByRole('option')
    .filter((o) => (o as HTMLOptionElement).value !== '');
  await user.selectOptions(catSelect, opts[0] as HTMLOptionElement);
}

async function fillRequired(
  user: ReturnType<typeof userEvent.setup>,
  { name = '베림볼로', discipline = 'bjj_gi' } = {},
) {
  await user.type(screen.getByLabelText('이름'), name);
  await user.selectOptions(screen.getByLabelText('종목'), discipline);
  await selectFirstCategory(user);
}

beforeEach(() => {
  m.isAuthEnabled.mockReturnValue(true);
  for (const fn of [m.createTechnique, m.updateTechnique]) {
    fn.mockReset();
    fn.mockResolvedValue({ ok: true });
  }
  m.persistMediaDrafts.mockReset();
  m.persistMediaDrafts.mockResolvedValue([]);
  m.invalidateQueries.mockClear();
  m.routerPush.mockClear();
  m.routerBack.mockClear();
  m.toast.success.mockClear();
  m.toast.error.mockClear();
  m.toast.info.mockClear();
  m.tagNames = [];
  m.existing = undefined;
  m.existingTagNames = undefined;
  m.existingMedia = undefined;
});

afterEach(cleanup);

describe('TechniqueForm', () => {
  // ── 초기 / 필수 ──
  it('create 초기: 저장 비활성 + 분류 select disabled(종목 미선택)', () => {
    render(<TechniqueForm mode="create" />);
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByLabelText('분류')).toBeDisabled();
  });

  it('이름+종목+분류 입력 → 저장 활성 + 분류 활성', async () => {
    const user = userEvent.setup();
    render(<TechniqueForm mode="create" />);
    await fillRequired(user);
    expect(screen.getByLabelText('분류')).toBeEnabled();
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
  });

  // ── 조건부 필드(belt↔level↔striking, 종목별) ──
  it('종목=주짓수 → 벨트 적합도 노출, 레벨/타격 숨김', async () => {
    const user = userEvent.setup();
    render(<TechniqueForm mode="create" />);
    await user.selectOptions(screen.getByLabelText('종목'), 'bjj_gi');
    expect(screen.getByText('벨트 적합도 (선택)')).toBeInTheDocument();
    expect(screen.queryByLabelText('레벨 적합도 (선택)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('타격 스타일 (선택)')).not.toBeInTheDocument();
  });

  it('종목=타격 → 타격 스타일 + 레벨 노출, 벨트 숨김', async () => {
    const user = userEvent.setup();
    render(<TechniqueForm mode="create" />);
    await user.selectOptions(screen.getByLabelText('종목'), 'striking');
    expect(screen.getByLabelText('타격 스타일 (선택)')).toBeInTheDocument();
    expect(screen.getByLabelText('레벨 적합도 (선택)')).toBeInTheDocument();
    expect(screen.queryByText('벨트 적합도 (선택)')).not.toBeInTheDocument();
  });

  it('종목=레슬링 → 레벨만 노출, 벨트/타격 숨김', async () => {
    const user = userEvent.setup();
    render(<TechniqueForm mode="create" />);
    await user.selectOptions(screen.getByLabelText('종목'), 'wrestling');
    expect(screen.getByLabelText('레벨 적합도 (선택)')).toBeInTheDocument();
    expect(screen.queryByText('벨트 적합도 (선택)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('타격 스타일 (선택)')).not.toBeInTheDocument();
  });

  it('종목 변경(주짓수→타격) → 벨트 섹션이 레벨/타격 섹션으로 교체', async () => {
    const user = userEvent.setup();
    render(<TechniqueForm mode="create" />);
    await user.selectOptions(screen.getByLabelText('종목'), 'bjj_gi');
    expect(screen.getByText('벨트 적합도 (선택)')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('종목'), 'striking');
    expect(screen.queryByText('벨트 적합도 (선택)')).not.toBeInTheDocument();
    expect(screen.getByLabelText('타격 스타일 (선택)')).toBeInTheDocument();
  });

  // ── 종목 변경 시 분류 리셋(handleDisciplineChange) — 핵심 분기 ──
  it('종목 변경 시 새 종목에 없는 분류는 리셋된다 (striking→주짓수)', async () => {
    const user = userEvent.setup();
    render(<TechniqueForm mode="create" />);
    await user.selectOptions(screen.getByLabelText('종목'), 'striking');
    await user.selectOptions(screen.getByLabelText('분류'), 'punch'); // STRIKING 전용
    expect(screen.getByLabelText('분류')).toHaveValue('punch');
    await user.selectOptions(screen.getByLabelText('종목'), 'bjj_gi'); // GRAPPLING 에 punch 없음 → 리셋
    expect(screen.getByLabelText('분류')).toHaveValue('');
  });

  it('종목 변경 시 공통 분류(entry)는 유지된다 (striking→주짓수)', async () => {
    const user = userEvent.setup();
    render(<TechniqueForm mode="create" />);
    await user.selectOptions(screen.getByLabelText('종목'), 'striking');
    await user.selectOptions(screen.getByLabelText('분류'), 'entry'); // 양 종목 공통
    await user.selectOptions(screen.getByLabelText('종목'), 'bjj_gi');
    expect(screen.getByLabelText('분류')).toHaveValue('entry'); // 유지 — "항상 리셋" 회귀도 잡는다
  });

  // ── create 저장 분기 ──
  it('create 저장 성공 → createTechnique + 성공 토스트 + router.push(/techniques) + invalidate', async () => {
    const user = userEvent.setup();
    render(<TechniqueForm mode="create" />);
    await fillRequired(user, { name: '베림볼로', discipline: 'bjj_gi' });
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(m.createTechnique).toHaveBeenCalled());
    expect(m.createTechnique).toHaveBeenCalledWith(
      expect.objectContaining({ name: '베림볼로', discipline: 'bjj_gi', visibility: 'private' }),
      [],
      [],
    );
    expect(m.toast.success).toHaveBeenCalledWith('저장됨');
    expect(m.routerPush).toHaveBeenCalledWith('/techniques');
    expect(m.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['techniques'] });
  });

  it('create 저장 dormant → info 토스트, navigation 없음', async () => {
    m.createTechnique.mockResolvedValue({ ok: false, dormant: true, error: '로그인 후 저장할 수 있어요' });
    const user = userEvent.setup();
    render(<TechniqueForm mode="create" />);
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(m.toast.info).toHaveBeenCalledWith('로그인 후 저장할 수 있어요'));
    expect(m.routerPush).not.toHaveBeenCalled();
    expect(m.invalidateQueries).not.toHaveBeenCalled(); // 성공 경로만 무효화
  });

  it('create 저장 error → error 토스트', async () => {
    m.createTechnique.mockResolvedValue({ ok: false, dormant: false, error: '저장 실패' });
    const user = userEvent.setup();
    render(<TechniqueForm mode="create" />);
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(m.toast.error).toHaveBeenCalledWith('저장 실패'));
    expect(m.routerPush).not.toHaveBeenCalled();
  });

  // ── edit prefill / 저장 ──
  it('edit prefill → 기존 값으로 폼을 채운다', async () => {
    m.existing = makeTech({ name: '기존 기술', discipline: 'bjj_nogi' });
    m.existingTagNames = [];
    m.existingMedia = [];
    render(<TechniqueForm mode="edit" techniqueId="t1" />);
    await waitFor(() => expect(screen.getByLabelText('이름')).toHaveValue('기존 기술'));
  });

  it('edit 저장 성공 → updateTechnique + router.back', async () => {
    m.existing = makeTech({ name: '기존 기술', discipline: 'bjj_nogi', category: 'submission' });
    m.existingTagNames = [];
    m.existingMedia = [];
    const user = userEvent.setup();
    render(<TechniqueForm mode="edit" techniqueId="t1" />);
    const save = await screen.findByRole('button', { name: '저장' });
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);
    await waitFor(() => expect(m.updateTechnique).toHaveBeenCalled());
    expect(m.updateTechnique.mock.calls[0][0]).toBe('t1'); // techniqueId 첫 인자
    expect(m.routerBack).toHaveBeenCalled();
    expect(m.routerPush).not.toHaveBeenCalled();
  });
});
