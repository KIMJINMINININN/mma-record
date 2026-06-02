import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// MatLog 웹앱 — 로직 우선 단위 테스트 (Vitest).
// 순수 함수/스키마 대상 → node 환경. React 컴포넌트/e2e는 후속 단계.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // globals 미사용: 각 테스트에서 vitest를 명시적으로 import (앱 typecheck 오염 방지)
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
