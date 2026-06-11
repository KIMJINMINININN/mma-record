'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Button, Input } from '@/shared/ui';
import { login, type AuthActionState } from '../actions';

/**
 * 로그인 폼 (F1 / Develop §10).
 *
 * React 19 `useActionState`로 login Server Action을 연결한다.
 * 액션 시그니처: (prevState, formData) => Promise<AuthActionState>.
 * pending(3번째 값)으로 제출 버튼을 비활성화하고, state.error를 role="alert"로 노출.
 * next(선택): 로그인 후 복귀할 내부 경로(공유 페이지 → 로그인 동선) — hidden으로 액션에 전달,
 * 검증(내부 경로만)은 서버 액션이 수행한다.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
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
        autoComplete="current-password"
        required
        placeholder="8자 이상"
      />

      {state?.error ? (
        <p role="alert" className="text-body-s-400 text-[var(--danger)]">
          <span aria-hidden="true">⚠ </span>
          {state.error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" block disabled={pending}>
        {pending ? '로그인 중…' : '로그인'}
      </Button>

      <p className="text-center text-body-s-400 text-[var(--text-muted)]">
        계정이 없으신가요?{' '}
        <Link
          href="/signup"
          className="text-[var(--primary)] underline underline-offset-2"
        >
          회원가입
        </Link>
      </p>
    </form>
  );
}
