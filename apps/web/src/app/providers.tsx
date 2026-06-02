'use client';

import { useState, type ReactNode } from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { ThemeProvider } from '@/shared/ui/theme';

/**
 * Providers — 전역 클라이언트 프로바이더 (Develop §6.4 / §6b).
 *
 * - QueryClientProvider: TanStack Query. 인스턴스를 useState로 1회 생성해
 *   리렌더/HMR 시 캐시 유지(서버 데이터는 Query가 단일 출처, §6b).
 * - ThemeProvider: 마운트 시 localStorage→스토어 hydrate(테마 UI 동기화).
 * - Toaster(sonner): F3에서 도입 — 세션 저장 결과(성공/도먼시 안내/오류) 토스트.
 *   top-center · richColors(상태색) · closeButton.
 *
 * **쿼리 에러 폴리시(공통 패턴):** QueryCache `onError`로 모든 읽기 쿼리 실패를 토스트로 표면화한다
 * (그 전엔 useQuery 실패가 조용히 빈 상태로 떨어짐). queryHash를 토스트 id로 써 쿼리별 1개로 dedupe,
 * '재시도' 액션으로 해당 쿼리만 refetch. 기본 retry(3회) 소진 후에만 발화 → 일시 오류엔 안 뜸.
 * 예외: 서명URL(`['media','signed',*]`)은 UploadVideo가 인라인 에러로 처리하므로 전역 토스트에서 제외(중복 방지).
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      queryCache: new QueryCache({
        onError: (error, query) => {
          // 인라인으로 처리되는 서명URL 실패는 전역 토스트 제외(UploadVideo가 자체 표시).
          if (query.queryKey[0] === 'media' && query.queryKey[1] === 'signed') return;
          toast.error('데이터를 불러오지 못했어요.', {
            id: `query-error:${query.queryHash}`, // 쿼리별 1개로 합침(스팸 방지)
            description: error instanceof Error ? error.message : undefined,
            action: {
              label: '재시도',
              onClick: () => {
                void client.refetchQueries({ queryKey: query.queryKey, exact: true });
              },
            },
          });
        },
      }),
      defaultOptions: {
        queries: {
          // 상호작용 데이터 위주 — 과도한 자동 refetch 억제(WebView 성능 §10.3).
          staleTime: 60_000,
          refetchOnWindowFocus: false,
        },
      },
    });
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
