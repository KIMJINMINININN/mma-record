// jest-dom 매처(toBeInTheDocument, toHaveClass 등) 등록.
// 컴포넌트 테스트(jsdom)에서 사용. node 로직 테스트에는 영향 없음.
import '@testing-library/jest-dom/vitest';

// RTL auto-cleanup: 각 테스트 후 렌더 트리를 정리해 DOM 누출을 방지한다.
// Vitest는 jest globals(afterEach)를 자동 주입하지 않으므로 명시적으로 등록한다.
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(cleanup);
