'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';

/**
 * 인증 Server Actions (F1 / Develop §10).
 *
 * 이메일+비밀번호 로그인/회원가입/로그아웃. `@supabase/ssr` 쿠키 세션 기반.
 * 세션 갱신(쿠키 회전)은 proxy(src/proxy.ts)가, RLS는 서버 클라이언트가 담당.
 *
 * 도먼시(dormancy): `isAuthEnabled()`가 false면 stale Supabase로의 네트워크 호출을
 * 막고 친절한 안내 에러를 반환한다(인프라 last 제약). 인프라 단계에서 플래그를 켜면 그대로 동작.
 *
 * redirect()는 throw 기반이므로 try/catch 밖, 액션 말미에서 호출한다.
 *
 * SSoT: docs/mma/Develop.md §10 / PRD §F1
 */

/** 이메일+비밀번호 자격증명 스키마 (rank.ts의 zod 스타일에 맞춤). */
const credentialsSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
});

/** 폼 액션 반환 상태 — useActionState(React 19)와 연결. */
export type AuthActionState = { error?: string; message?: string } | undefined;

/** 인증 미연결 안내(인프라 단계 전 공통). */
const AUTH_DISABLED_MESSAGE =
  '인증은 인프라 연결(NEXT_PUBLIC_AUTH_ENABLED) 후 활성화됩니다.';

/**
 * 로그인 — 성공 시 `/calendar`로 이동.
 * @param _prevState 직전 상태(useActionState 시그니처상 필요, 미사용)
 * @param formData email · password
 */
export async function login(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' };
  }

  // 도먼시: 플래그 OFF면 stale Supabase로 호출하지 않고 안내만 반환.
  if (!isAuthEnabled()) {
    return { error: AUTH_DISABLED_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/calendar');
}

/**
 * 회원가입 — DB의 handle_new_user() 트리거가 profiles 행을 자동 생성하므로
 * 여기서는 profiles에 직접 insert하지 않는다(Develop §10).
 * 세션 즉시 발급(email confirm OFF) → `/calendar`. 확인메일 발송(ON) → 안내 메시지.
 * @param _prevState 직전 상태(useActionState 시그니처상 필요, 미사용)
 * @param formData email · password
 */
export async function signup(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' };
  }

  // 도먼시: 플래그 OFF면 stale Supabase로 호출하지 않고 안내만 반환.
  if (!isAuthEnabled()) {
    return { error: AUTH_DISABLED_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: error.message };
  }

  // TODO(T5): email confirm 여부 확정 — 프로젝트 Auth 설정에 따라 분기.
  if (!data.session) {
    return { message: '확인 이메일을 보냈습니다. 메일의 링크로 인증을 완료하세요.' };
  }

  revalidatePath('/', 'layout');
  redirect('/calendar');
}

/**
 * 로그아웃 — 세션 종료 후 `/login`으로 이동.
 * 인자 없는 Server Action이므로 `<form action={logout}>`에 직접 연결 가능.
 */
export async function logout(): Promise<void> {
  if (!isAuthEnabled()) {
    redirect('/login');
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  redirect('/login');
}
