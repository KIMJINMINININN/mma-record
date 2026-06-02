import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// MatLog 웹앱 — 단위/컴포넌트 테스트 (Vitest).
// 기본 환경은 node(순수 로직). 컴포넌트 테스트는 파일 상단에
// `// @vitest-environment jsdom` 주석으로 jsdom을 opt-in 한다.

// 모노레포 hoisted 레이아웃에서 root node_modules의 react(19.1.x)와
// apps/web/node_modules의 react(19.2.x)가 공존한다.
// @vitejs/plugin-react 는 apps/web 의 react 를 사용하므로, 모든 import를
// 동일한 인스턴스(apps/web/node_modules/react)로 고정해야 "Invalid hook call"을 방지한다.
// subpath(jsx-runtime, react-dom/client 등)도 동일 폴더로 강제한다.
const webReact = path.resolve(__dirname, 'node_modules/react');
const webReactDom = path.resolve(__dirname, 'node_modules/react-dom');

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    server: {
      deps: {
        // @testing-library/* 를 inline 해서 위 alias 가 RTL 내부 import 에도 적용되게 한다.
        // 단일 React 인스턴스의 최종 보장은 scripts/link-test-react.mjs (test 전 실행)가 한다
        // — 모노레포 hoisted 레이아웃(mobile react 19.1.0 ↔ web 19.2.4)에서 필수.
        inline: [/@testing-library\//],
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Subpath aliases must come before bare-package aliases.
      'react/jsx-runtime': path.resolve(webReact, 'jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(webReact, 'jsx-dev-runtime'),
      'react-dom/client': path.resolve(webReactDom, 'client'),
      'react-dom/server': path.resolve(webReactDom, 'server'),
      // Bare-package aliases (catch-all).
      react: webReact,
      'react-dom': webReactDom,
    },
  },
});
