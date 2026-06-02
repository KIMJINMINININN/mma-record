import { LoginForm } from './login-form';

/**
 * 로그인 (F1 / Develop §6.4 / §10).
 *
 * (auth) 그룹은 AppShell 크롬 없이 중앙 정렬 단일 화면.
 * 폼 상호작용은 client(<LoginForm/>) + login Server Action((auth)/actions.ts)이 담당.
 * 인증 미연결 단계(NEXT_PUBLIC_AUTH_ENABLED=false)에선 제출 시 친절한 안내 에러만 반환된다.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--surface-app)] px-6">
      <div className="w-full max-w-sm rounded-l border border-[var(--border-subtle)] bg-[var(--surface-base)] p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-heading-l text-[var(--text-strong)]">로그인</h1>
        <p className="mt-1 text-body-s-400 text-[var(--text-muted)]">
          MatLog에 로그인하세요.
        </p>

        <LoginForm />
      </div>
    </main>
  );
}
