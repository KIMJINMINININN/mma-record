'use client';

import { Button } from '@/shared/ui';

import { unregisterStoredPushToken } from '../model/push-token-storage';

/**
 * LogoutButton — 로그아웃 직전 이 디바이스의 푸시 토큰을 해제하는 폼 버튼 (푸시 위생 / 0035).
 *
 * 기존 프로필의 `<form action={logout}>`를 감싼다: 클라이언트 action이 먼저
 * unregisterStoredPushToken()을 베스트 에포트로 수행한 뒤 서버 action(세션 종료+리다이렉트)을 호출한다.
 * 해제 실패/토큰 부재(브라우저)여도 로그아웃은 항상 진행 — 남은 행은 다음 계정 로그인 시
 * register_push_token의 on-conflict 소유이전이 백스톱으로 정리한다.
 */
export function LogoutButton({ logoutAction }: { logoutAction: () => Promise<void> }) {
  return (
    <form
      action={async () => {
        await unregisterStoredPushToken();
        await logoutAction();
      }}
    >
      <Button type="submit" variant="ghost" size="sm">
        로그아웃
      </Button>
    </form>
  );
}
