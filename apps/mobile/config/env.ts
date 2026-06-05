export type Environment = 'develop' | 'beta' | 'production';

type EnvConfig = {
  CLIENT_URL: string;
  API_BASE_URL: string;
};

// MMA 웹앱(apps/web, Next.js)을 WebView로 로드한다. CLIENT_URL = 실 Vercel prod 도메인.
// 별도 dev/beta 배포가 없어 세 환경 모두 prod를 가리킨다(단일 배포). 로컬 개발은
// EXPO_PUBLIC_CLIENT_URL 오버라이드로 로컬 Next dev 서버를 가리킨다.
// 예: EXPO_PUBLIC_CLIENT_URL=http://192.168.0.10:3000 pnpm --filter @the-others/mobile start
// API_BASE_URL은 네이티브 직접 API 호출(후속) 예약 슬롯 — 현재 WebView 로드엔 미사용(Supabase가 백엔드).
const PROD_CLIENT_URL = 'https://mma-record-web.vercel.app';
const envConfigs: Record<Environment, EnvConfig> = {
  develop: {
    CLIENT_URL: PROD_CLIENT_URL, // 로컬은 EXPO_PUBLIC_CLIENT_URL 오버라이드 사용
    API_BASE_URL: PROD_CLIENT_URL,
  },
  beta: {
    CLIENT_URL: PROD_CLIENT_URL,
    API_BASE_URL: PROD_CLIENT_URL,
  },
  production: {
    CLIENT_URL: PROD_CLIENT_URL,
    API_BASE_URL: PROD_CLIENT_URL,
  },
};

// 현재 환경 설정 - Expo 환경변수 또는 기본값 사용
const CURRENT_ENV: Environment =
  (process.env.EXPO_PUBLIC_APP_ENV as Environment) || 'develop';

// EXPO_PUBLIC_CLIENT_URL이 설정되면 per-env 기본 CLIENT_URL보다 우선한다.
// (로컬 Next dev 서버를 WebView에 띄우기 위한 개발용 오버라이드 — 인프라 도메인 확정 전까지 사용)
const CLIENT_URL_OVERRIDE = process.env.EXPO_PUBLIC_CLIENT_URL;

export const ENV = {
  ...envConfigs[CURRENT_ENV],
  ...(CLIENT_URL_OVERRIDE ? { CLIENT_URL: CLIENT_URL_OVERRIDE } : {}),
  CURRENT_ENV,
  isDevelopment: CURRENT_ENV === 'develop',
  isBeta: CURRENT_ENV === 'beta',
  isProduction: CURRENT_ENV === 'production',
} as const;
