export type Environment = 'develop' | 'beta' | 'production';

type EnvConfig = {
  CLIENT_URL: string;
  API_BASE_URL: string;
};

// MMA 웹앱(apps/web, Next.js)을 WebView로 로드한다.
// 아래 per-env URL은 인프라 단계(Vercel 프로비저닝)에서 실제 도메인으로 교체된다.
// 그 전까지는 EXPO_PUBLIC_CLIENT_URL 오버라이드로 로컬 dev 서버를 가리킨다.
// 예: EXPO_PUBLIC_CLIENT_URL=http://192.168.0.10:3000 pnpm --filter @the-others/mobile start
const envConfigs: Record<Environment, EnvConfig> = {
  develop: {
    CLIENT_URL: 'https://dev.example.com', // TODO(인프라): MMA 웹앱 개발 Vercel 도메인으로 교체
    API_BASE_URL: 'https://dev-api.example.com', // TODO(인프라): MMA 개발 API 도메인으로 교체
  },
  beta: {
    CLIENT_URL: 'https://beta.example.com', // TODO(인프라): MMA 웹앱 베타 Vercel 도메인으로 교체
    API_BASE_URL: 'https://beta-api.example.com', // TODO(인프라): MMA 베타 API 도메인으로 교체
  },
  production: {
    CLIENT_URL: 'https://example.com', // TODO(인프라): MMA 웹앱 운영 Vercel 도메인으로 교체
    API_BASE_URL: 'https://api.example.com', // TODO(인프라): MMA 운영 API 도메인으로 교체
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
