'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Button, Input } from '@/shared/ui';
import { signup, type AuthActionState } from '../actions';

/**
 * 회원가입 폼 (F1 / Develop §10).
 *
 * React 19 `useActionState`로 signup Server Action을 연결한다.
 * 성공(확인메일 발송)은 state.message로, 실패는 state.error(role="alert")로 노출.
 * 세션 즉시 발급(email confirm OFF) 시엔 서버 액션이 /calendar로 redirect 한다.
 */
export function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    signup,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <Input
        label="이메일"
        type="email"
        name="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />
      <Input
        label="비밀번호"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        placeholder="8자 이상"
      />

      {state?.message ? (
        <p role="status" className="text-body-s-400 text-[var(--text-default)]">
          <span aria-hidden="true">ⓘ </span>
          {state.message}
        </p>
      ) : null}
      {state?.error ? (
        <p role="alert" className="text-body-s-400 text-[var(--danger)]">
          <span aria-hidden="true">⚠ </span>
          {state.error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" block disabled={pending}>
        {pending ? '가입 중…' : '회원가입'}
      </Button>

      <p className="text-center text-body-s-400 text-[var(--text-muted)]">
        이미 계정이 있으신가요?{' '}
        <Link
          href="/login"
          className="text-[var(--primary)] underline underline-offset-2"
        >
          로그인
        </Link>
      </p>
    </form>
  );
}
