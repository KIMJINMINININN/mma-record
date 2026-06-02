import { THEME_STORAGE_KEY } from './theme-store';

/**
 * themeScript — `<head>`에서 paint 전에 실행되는 인라인 스크립트 (Design §2.8 / §11-D3).
 *
 * FOUC(테마 깜빡임) 방지: React hydrate 전에 `<html data-theme>`를 확정한다.
 * 로직은 `@custom-variant dark`(tailwind-theme.css) 및 theme-store와 **정확히 일치**:
 *   · 저장값이 'light' | 'dark' → data-theme = 저장값.
 *   · 'system' | 미저장        → data-theme 미설정 → CSS prefers-color-scheme 분기 적용.
 * try/catch로 localStorage 접근 실패(시크릿/WebView 제약)에도 안전.
 */
const themeScript = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var t=localStorage.getItem(k);if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}else{delete document.documentElement.dataset.theme;}}catch(e){}})();`;

/**
 * ThemeScript — themeScript를 `<head>`에 인라인 주입하는 서버 컴포넌트.
 * RootLayout의 `<head>` 안에서 렌더한다.
 */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}

export { themeScript };
