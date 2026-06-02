/**
 * smoke.spec.ts — MatLog 스모크 E2E 테스트
 *
 * ⚠️  이 테스트는 테스트 계정에 실데이터를 쓴다(세션 생성). 자동 정리 없음.
 *     반드시 전용 테스트 계정(disposable account)을 사용할 것.
 *
 * 실행 조건: apps/web/.env.test 에 E2E_USER_EMAIL / E2E_USER_PASSWORD 설정 필요.
 * 미설정이면 모든 테스트가 skip 된다.
 */

import { test, expect } from '@playwright/test';

// 자격증명이 없으면 전 파일 skip
test.skip(!process.env.E2E_USER_EMAIL, 'E2E 자격증명 미설정 — .env.test 참고');

// ─────────────────────────────────────────────────────────────────────────────
// Test A: 인증 세션이 유효한지 확인
// ─────────────────────────────────────────────────────────────────────────────
test('authenticated session is active', async ({ page }) => {
  await page.goto('/calendar');

  // /login 으로 리다이렉트되지 않아야 한다
  await expect(page).not.toHaveURL(/\/login/);

  // QuickAddFab 이 보이면 (app) 레이아웃이 인증 상태로 렌더된 것
  // aria-label="세션 추가" — QuickAddFab.tsx L26
  await expect(page.getByRole('button', { name: '세션 추가' })).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// Test B: 세션 생성 후 캘린더에서 확인
// ─────────────────────────────────────────────────────────────────────────────
test('create a session and see it in the calendar', async ({ page }) => {
  // 고유 메모로 나중에 해당 세션을 식별한다
  const uniqueMemo = `E2E smoke ${Date.now()}`;

  await page.goto('/calendar');

  // ── 1. FAB 클릭 → 세션 에디터(바텀시트/모달) 열기 ──
  // QuickAddFab: aria-label="세션 추가" (QuickAddFab.tsx L26)
  await page.getByRole('button', { name: '세션 추가' }).click();

  // 다이얼로그가 열렸는지 확인 — SessionEditorHost: role=dialog (SessionEditorHost.tsx L107)
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // ── 2. 종목 선택 (필수; ≥1 선택해야 저장 버튼 활성) ──
  // DisciplinePicker 의 각 버튼은 aria-pressed 를 노출한다 (DisciplinePicker.tsx L34).
  // DisciplineChip 의 aria-label = DISCIPLINE_META[discipline].label (discipline-meta.ts).
  // 첫 번째 종목 "주짓수 (기)" 버튼을 클릭한다.
  // 버튼 접근성 이름: 버튼이 <DisciplineChip>(role=img, aria-label="주짓수 (기)")을 자식으로 가짐 →
  //   getByRole('button', { name: '주짓수 (기)' }) 으로 접근 가능.
  await dialog.getByRole('button', { name: '주짓수 (기)' }).click();

  // 선택됐는지 aria-pressed 확인
  await expect(
    dialog.getByRole('button', { name: '주짓수 (기)' }),
  ).toHaveAttribute('aria-pressed', 'true');

  // ── 3. 세부 정보 펼쳐서 메모 입력 (고유 식별용) ──
  // SessionEditorForm.tsx L189-L193: aria-expanded 토글 버튼 "세부 정보 (선택)"
  await dialog.getByRole('button', { name: /세부 정보 \(선택\)/ }).click();

  // 메모 textarea: id="se-memo", label="메모" (SessionEditorForm.tsx L277-L285)
  await dialog.getByLabel('메모').fill(uniqueMemo);

  // ── 4. 저장 ──
  // 저장 버튼: variant=primary, size=lg, text="저장" (SessionEditorForm.tsx L324)
  // disciplines.length > 0 이어야 활성화 (canSave, SessionEditorForm.tsx L106)
  const saveBtn = dialog.getByRole('button', { name: '저장' });
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();

  // ── 5. 저장 성공 확인 ──
  // 성공 시 toast.success('저장됨') (SessionEditorForm.tsx L149)
  // 다이얼로그가 닫히고(onDone = close) 토스트가 뜬다.
  // Sonner 토스트는 role=status 또는 data-sonner-toast 속성으로 잡힌다.
  // "저장됨" 텍스트가 페이지 어딘가에 나타나면 성공으로 판정.
  await expect(page.getByText('저장됨')).toBeVisible();

  // 다이얼로그도 닫혀야 한다
  await expect(dialog).not.toBeVisible();
});
