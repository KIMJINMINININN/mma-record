/**
 * auth.setup.ts — Playwright 인증 설정 프로젝트
 *
 * E2E_USER_EMAIL / E2E_USER_PASSWORD 가 .env.test 에 설정돼 있으면
 * /login 을 거쳐 실제 로그인 후 storageState 를 저장한다.
 * 미설정이면 빈 storageState 를 써서 파일을 만들어 두고 skip —
 * chromium 프로젝트가 파일을 로드하려 할 때 ENOENT 로 깨지지 않도록 한다.
 */

import fs from 'node:fs';
import path from 'node:path';

import { test as setup, expect } from '@playwright/test';

const STORAGE_STATE_PATH = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    // 빈 storageState 파일을 써서 chromium 프로젝트가 파일 로드에 실패하지 않도록.
    const dir = path.dirname(STORAGE_STATE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      STORAGE_STATE_PATH,
      JSON.stringify({ cookies: [], origins: [] }),
    );
    setup.skip(true, 'E2E_USER_EMAIL/PASSWORD 미설정 — apps/web/.env.test 참고');
    return;
  }

  // 로그인 폼:
  //   이메일 필드: label="이메일" (type=email, name=email)
  //   비밀번호 필드: label="비밀번호" (type=password, name=password)
  //   제출 버튼: role=button, name="로그인"
  //   성공 시 redirect → /calendar
  await page.goto('/login');

  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();

  // 로그인 성공 → /calendar 로 이동
  await expect(page).toHaveURL(/\/calendar/);

  // storageState(쿠키+localStorage) 저장
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
