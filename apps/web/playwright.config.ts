import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';

// e2e 전용 환경값(.env.test, gitignore) 로드 — 테스트 계정 자격증명 등.
// 앱 자체의 Supabase 값은 next dev 가 .env.local 에서 읽는다(별개).
dotenv.config({ path: path.resolve(__dirname, '.env.test'), quiet: true });

// E2E_BASE_URL 이 지정되면 그 대상(예: 배포 사이트)으로, 아니면 로컬 next dev 자동 기동.
const EXTERNAL = process.env.E2E_BASE_URL;
const BASE_URL = EXTERNAL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    // 1) 로그인해서 storageState 저장
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    // 2) 저장된 세션으로 스모크 실행
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  // 로컬 대상일 때만 next dev 를 띄운다(실 Supabase = .env.local). 외부 대상이면 생략.
  webServer: EXTERNAL
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
