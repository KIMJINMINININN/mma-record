// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * TechniqueDetailView — 4가지 상태 분기(AUTH OFF 미리보기 · 로딩 · 미발견 · 실데이터) +
 * belt↔level 상호배타 + 헤더/태그/미디어/주의점/역참조 세션 검증.
 *
 * react-query/env 를 mock 해 hoisted 모노레포의 "Invalid hook call" 을 회피한다(TagManager 패턴).
 * useQuery 는 queryKey 로 분기해 본체/세션/태그/미디어 data 를 주입한다(queryFn 은 호출되지 않음).
 * 미디어 자식(YoutubeFacade/UploadVideo/ExternalLinkCard)·FavoriteStar 는 stub —
 * 서명URL useQuery·서버 액션 체인을 끌어오지 않게. chip/badge/MarkdownView/EmptyState 는 실제 렌더.
 */
const m = vi.hoisted(() => ({
  isAuthEnabled: vi.fn(() => true),
  technique: undefined as Record<string, unknown> | null | undefined,
  techniqueLoading: false,
  sessions: [] as Array<Record<string, unknown>>,
  sessionsLoading: false,
  tags: [] as string[],
  media: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/shared/api/supabase/env', () => ({ isAuthEnabled: m.isAuthEnabled }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    const sub = queryKey[2];
    if (sub === 'sessions') return { data: m.sessions, isLoading: m.sessionsLoading };
    if (sub === 'tags') return { data: m.tags, isLoading: false };
    if (sub === 'media') return { data: m.media, isLoading: false };
    return { data: m.technique, isLoading: m.techniqueLoading };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('./TechniqueFavoriteStar', () => ({
  TechniqueFavoriteStar: () => null,
}));
// next/link 는 next 번들의 중첩 react(useContext)를 끌어와 hoisted 모노레포에서 깨진다 → <a> 스텁.
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ href, children }: { href: string; children?: import('react').ReactNode }) =>
      createElement('a', { href }, children),
  };
});
vi.mock('@/entities/media', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/media')>();
  const { createElement } = await import('react');
  return {
    ...actual,
    YoutubeFacade: ({ videoId }: { videoId: string }) =>
      createElement('div', { 'data-testid': 'media-youtube' }, videoId),
    UploadVideo: ({ storagePath }: { storagePath: string }) =>
      createElement('div', { 'data-testid': 'media-upload' }, storagePath),
    ExternalLinkCard: ({ url }: { url: string }) =>
      createElement('div', { 'data-testid': 'media-external' }, url),
  };
});

import { TechniqueDetailView } from './TechniqueDetailView';

function makeTech(over: Record<string, unknown> = {}) {
  return {
    id: 't1',
    user_id: 'u',
    name: '베림볼로',
    discipline: 'bjj_nogi',
    category: 'submission',
    position: 'back_control',
    belt: 'blue',
    belt_stripes: 2,
    striking_style: null,
    level: null,
    description_md: '기술 설명 본문',
    details_md: null,
    is_favorite: false,
    visibility: 'private',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function makeSession(id: string, trained_on: string, over: Record<string, unknown> = {}) {
  return {
    id,
    user_id: 'u',
    trained_on,
    gym: null,
    class_type: null,
    duration_min: null,
    intensity: null,
    rounds: null,
    partners: null,
    memo_md: null,
    rating: null,
    is_favorite: false,
    visibility: 'private',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    disciplines: [],
    ...over,
  };
}

beforeEach(() => {
  m.isAuthEnabled.mockReturnValue(true);
  m.technique = undefined;
  m.techniqueLoading = false;
  m.sessions = [];
  m.sessionsLoading = false;
  m.tags = [];
  m.media = [];
});

afterEach(cleanup);

describe('TechniqueDetailView', () => {
  // ── 헤더(모든 상태 공통 셸) ──
  it('헤더: 라이브러리/수정 링크는 항상 노출(올바른 href)', () => {
    m.isAuthEnabled.mockReturnValue(false);
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.getByRole('link', { name: /라이브러리/ })).toHaveAttribute('href', '/techniques');
    expect(screen.getByRole('link', { name: '수정' })).toHaveAttribute(
      'href',
      '/techniques/t1/edit',
    );
  });

  // ── 상태 1: AUTH OFF → PreviewBody ──
  it('AUTH OFF → 미리보기 본문(placeholder 제목 + "미리보기" 표식)', () => {
    m.isAuthEnabled.mockReturnValue(false);
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.getByText('미리보기')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '기술 이름' })).toBeInTheDocument();
    expect(screen.queryByText('기술을 찾을 수 없습니다')).not.toBeInTheDocument();
  });

  // ── 상태 2: AUTH ON + 로딩 → Skeleton 폴백(분기 어느 것도 아님) ──
  it('AUTH ON + 로딩 → 미리보기/미발견/실데이터 모두 아님', () => {
    m.techniqueLoading = true;
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.queryByText('미리보기')).not.toBeInTheDocument();
    expect(screen.queryByText('기술을 찾을 수 없습니다')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  // ── 상태 3: AUTH ON + null → EmptyState ──
  it('AUTH ON + 미발견(null) → "기술을 찾을 수 없습니다"', () => {
    m.technique = null;
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.getByText('기술을 찾을 수 없습니다')).toBeInTheDocument();
  });

  // ── 상태 4: found ──
  it('found → 제목 렌더', () => {
    m.technique = makeTech({ name: '베림볼로' });
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.getByRole('heading', { level: 1, name: '베림볼로' })).toBeInTheDocument();
  });

  it('found(주짓수+belt) → BeltBadge 노출, LevelChip 없음 (belt↔level 상호배타)', () => {
    m.technique = makeTech({ discipline: 'bjj_nogi', belt: 'blue', belt_stripes: 2, level: null });
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.getByLabelText(/블루/)).toBeInTheDocument(); // BeltBadge(role=img, aria-label 블루)
    expect(screen.queryByLabelText(/^레벨 /)).not.toBeInTheDocument(); // LevelChip 없음
  });

  it('found(비벨트 wrestling+level) → LevelChip 노출, BeltBadge 없음 (belt↔level 상호배타)', () => {
    m.technique = makeTech({
      discipline: 'wrestling',
      position: null,
      belt: null,
      belt_stripes: null,
      level: 'intermediate',
    });
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.getByLabelText('레벨 중급')).toBeInTheDocument(); // LevelChip
    expect(screen.queryByLabelText(/벨트/)).not.toBeInTheDocument(); // BeltBadge 없음(belt=null)
  });

  it('belt·level 둘 다 있어도 주짓수면 BeltBadge만 (usesBelt 게이트 실작동)', () => {
    m.technique = makeTech({ discipline: 'bjj_nogi', belt: 'blue', belt_stripes: 2, level: 'intermediate' });
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.getByLabelText(/블루 벨트/)).toBeInTheDocument();
    expect(screen.queryByLabelText('레벨 중급')).not.toBeInTheDocument();
  });

  it('belt·level 둘 다 있어도 비벨트(wrestling)면 LevelChip만 (usesBelt 게이트 실작동)', () => {
    m.technique = makeTech({
      discipline: 'wrestling',
      position: null,
      belt: 'blue',
      belt_stripes: 2,
      level: 'intermediate',
    });
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.getByLabelText('레벨 중급')).toBeInTheDocument();
    expect(screen.queryByLabelText(/벨트/)).not.toBeInTheDocument();
  });

  it('found + 태그 → TagChip 행', () => {
    m.technique = makeTech();
    m.tags = ['백테이크', '디테일'];
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.getByText('백테이크')).toBeInTheDocument();
    expect(screen.getByText('디테일')).toBeInTheDocument();
  });

  it('found + media 없음 → MediaStub("준비 중")', () => {
    m.technique = makeTech();
    m.media = [];
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.getByText('YouTube (준비 중)')).toBeInTheDocument();
  });

  it('found + youtube media → YoutubeFacade 렌더(스텁), 스텁 자리 없음', () => {
    m.technique = makeTech();
    m.media = [{ id: 'md1', kind: 'youtube', youtube_video_id: 'abc123', title: null }];
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.getByTestId('media-youtube')).toHaveTextContent('abc123');
    expect(screen.queryByText('YouTube (준비 중)')).not.toBeInTheDocument();
  });

  it('found + details_md → 주의점 Callout', () => {
    m.technique = makeTech({ details_md: '견갑 고정 주의' });
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.getByText('주의점 / 디테일')).toBeInTheDocument();
    expect(screen.getByText('견갑 고정 주의')).toBeInTheDocument();
  });

  it('found + details_md 없음 → 주의점 Callout 미표시', () => {
    m.technique = makeTech({ details_md: null });
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.queryByText('주의점 / 디테일')).not.toBeInTheDocument();
  });

  it('found + 역참조 세션 → 날짜 라벨이 있는 세션 행', () => {
    m.technique = makeTech();
    m.sessions = [makeSession('s1', '2026-05-22', { disciplines: ['bjj_nogi'] })];
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.getByText(/2026년 5월 22일/)).toBeInTheDocument();
  });

  it('found + 역참조 세션 없음 → 연결 세션 EmptyState', () => {
    m.technique = makeTech();
    m.sessions = [];
    render(<TechniqueDetailView techniqueId="t1" />);
    expect(screen.getByText('아직 연결된 세션이 없습니다')).toBeInTheDocument();
  });
});
