// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * ShareView — 봉투 RPC(get_shared_resource) 결과를 type 으로 분기해 세션/기술 카드를 렌더하는지 검증.
 *
 * TechniqueDetailView.test 와 동일하게 @tanstack/react-query 를 mock 한다 — hoisted 모노레포에서
 * react-query 의 중첩 react(RN 핀 19.1.0)가 web 컴포넌트(19.2.x)와 인스턴스가 갈려 실제 QueryClientProvider
 * 는 "Invalid hook call" 이 난다(repo 관용구: 컴포넌트 테스트는 useQuery 를 mock). 다만 여기선 useQuery 가
 * **실제 queryFn 을 실행**하도록 얇게 구현해(useState+useEffect, microtask) useSharedResource 의 봉투/널
 * 내로잉(rpc 호출 → !envelope.data → null)까지 진짜로 거치게 한다. 봉투를 돌려주는 Supabase rpc 만 mock.
 * queryFn 이 microtask 로 resolve 하므로 findByText(async)로 단언한다.
 * 미디어가 빈 케이스만 다루므로 YoutubeFacade/ExternalLinkCard 는 렌더되지 않아 mock 불필요.
 * MarkdownView 는 'use client' 라도 jsdom 에서 정상 import(DOMPurify는 window 존재 시 동작)되어 mock 없음.
 */
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/shared/api/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({ rpc: m.rpc }),
}));
// 실제 queryFn 을 microtask 로 돌리는 얇은 useQuery — useSharedResource 의 rpc/내로잉을 진짜로 거친다.
vi.mock('@tanstack/react-query', async () => {
  const { useState, useEffect } = await import('react');
  return {
    useQuery: <T,>({ queryFn }: { queryFn: () => Promise<T> }) => {
      const [state, setState] = useState<{
        data: T | undefined;
        isLoading: boolean;
        isError: boolean;
      }>({ data: undefined, isLoading: true, isError: false });
      useEffect(() => {
        let active = true;
        queryFn()
          .then((data) => active && setState({ data, isLoading: false, isError: false }))
          .catch(() => active && setState({ data: undefined, isLoading: false, isError: true }));
        return () => {
          active = false;
        };
        // queryFn 은 렌더마다 새 클로저 — 1회 실행 의도라 의존성 비움(테스트 한정 단순화).
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return state;
    },
  };
});

import { ShareView } from './share-view';

beforeEach(() => {
  m.rpc.mockReset();
});

afterEach(cleanup);

describe('ShareView', () => {
  it('기술 봉투 → 기술 카드(이름 + 설명) 렌더', async () => {
    m.rpc.mockResolvedValue({
      data: {
        type: 'technique',
        data: {
          name: '백 테이크',
          discipline: 'bjj_nogi',
          category: 'submission',
          position: 'back_control',
          striking_style: null,
          belt: 'blue',
          belt_stripes: 1,
          level: null,
          description_md: '설명',
          details_md: null,
          tags: ['디테일'],
          media: [],
        },
      },
      error: null,
    });

    render(<ShareView token="tok" />);
    expect(await screen.findByText('백 테이크')).toBeInTheDocument();
    // description_md('설명')는 MarkdownView 가 <p>로 렌더 → '설명' 섹션 라벨과 합쳐 2회 등장.
    // (라벨 1 + 본문 1) 2개를 단언해 본문이 실제로 렌더됐음을 확인한다.
    expect(await screen.findAllByText('설명')).toHaveLength(2);
  });

  it('세션 봉투 → 세션 카드(날짜 헤더) 렌더', async () => {
    m.rpc.mockResolvedValue({
      data: {
        type: 'session',
        data: {
          trained_on: '2026-06-01',
          gym: null,
          class_type: null,
          duration_min: null,
          intensity: null,
          rounds: null,
          partners: null,
          memo_md: null,
          disciplines: [],
          techniques: [],
          tags: [],
          media: [],
        },
      },
      error: null,
    });

    render(<ShareView token="tok" />);
    expect(await screen.findByText(/6월 1일/)).toBeInTheDocument();
  });

  it('data=null → "존재하지 않거나 만료된 공유예요" 안내', async () => {
    m.rpc.mockResolvedValue({ data: null, error: null });

    render(<ShareView token="tok" />);
    expect(await screen.findByText('존재하지 않거나 만료된 공유예요')).toBeInTheDocument();
  });
});
