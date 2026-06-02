import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeScript } from '@/shared/ui/theme';
import { Providers } from './providers';

/**
 * RootLayout — 앱 루트 (Develop §6.4).
 *
 * - `<html lang="ko" suppressHydrationWarning>`: ThemeScript가 paint 전에
 *   `data-theme`를 변형하므로 SSR↔클라이언트 속성 불일치 경고를 억제(Design §2.8/§11-D3).
 * - `<head>`에 ThemeScript 인라인 → FOUC 방지.
 * - body는 Providers(QueryClient + Theme)로 감싼다. Pretendard 폰트·기존 body 클래스 유지.
 * - 브랜드명 **MatLog**(T12 확정) — 종목 중립(매트 위 훈련) 네이밍.
 */

export const metadata: Metadata = {
  title: 'MatLog',
  description: 'MatLog — 주짓수·레슬링·타격·MMA 훈련을 날짜·태그·검색으로 기록하는 개인 훈련 일지.',
};

export const viewport: Viewport = {
  // 노치/홈 인디케이터 safe-area 사용을 위해 viewport-fit=cover (§10.3).
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#101012' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col font-pretendard">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
