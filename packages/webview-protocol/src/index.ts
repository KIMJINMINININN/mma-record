// WebView <-> Native 메시지 프로토콜
// 웹(Next.js)과 앱(Expo) 양쪽이 동일한 타입 정의를 공유하도록 추출됨.

/** 기본 메시지 봉투 — 모든 WebView ↔ Native 메시지가 따르는 형식. */
export type WebviewMessageType = {
  mode: string;
  data?: any;
};

/** 인증 도메인 메시지 (discriminated union by `mode`). */
export type AuthMessage =
  | { mode: 'AUTH_LOGIN'; data: { provider: string; credential: string } }
  | { mode: 'AUTH_LOGOUT'; data?: undefined }
  | { mode: 'AUTH_TOKEN_REFRESH'; data: { refreshToken: string } };
