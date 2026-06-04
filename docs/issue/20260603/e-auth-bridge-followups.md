# E-AUTH: WebView↔Native 인증 핸드오프 브릿지 — 후속 (2026-06-04)

> 핸드오프 백로그 **E**(모바일 Expo 트랙)의 첫 하위. 웹 로그인 상태를 네이티브 앱에 핸드오프.

## 무엇

webview-protocol의 `AuthMessage`(LOGIN/LOGOUT/TOKEN_REFRESH)는 정의돼 있었으나 **웹측 발신 ✗ · 앱측 토큰 보관 ✗**(콜백 슬롯만)이었음. 양쪽 연결 완성.

- **웹** (`features/webview-auth/WebViewAuthBridge`): supabase `onAuthStateChange` 구독, `window.ReactNativeWebView` + `isAuthEnabled()` 게이팅(브라우저/AUTH-OFF no-op). SIGNED_IN·INITIAL_SESSION→`AUTH_LOGIN{provider, credential=access_token}`, TOKEN_REFRESHED→`AUTH_TOKEN_REFRESH{refreshToken}`, SIGNED_OUT→`AUTH_LOGOUT`. (app)/layout 마운트.
- **앱** (`hooks/webview/auth-storage` + webview-screen ctx 주입): expo-secure-store. onLogin→saveSession(access+provider), onLogout→clearSession, onTokenRefresh→updateRefreshToken. 기존 auth-handlers 콜백 슬롯에 연결.

## 적대적 리뷰 (code-reviewer opus) — REQUEST CHANGES → 반영

- **[HIGH] WebView origin gate 부재 → 토큰 고정/DoS 표면 (수정 완료)**: webview-screen WebView가 `originWhitelist`/`onShouldStartLoadWithRequest` 없이 모든 http/https 로드 허용 → E-AUTH가 AUTH_LOGIN→SecureStore 쓰기를 연결하면서, 악성 페이지(http MITM·iframe·XSS)가 `postMessage(AUTH_LOGIN, 공격자토큰)`으로 **세션 고정**(사용자가 공격자로 인증) 또는 AUTH_LOGOUT **DoS** 가능. → **수정**: `originWhitelist={[ENV.CLIENT_URL]}` + `onShouldStartLoadWithRequest`(CLIENT_URL만 WebView 로드, 외부는 Linking 외부 브라우저). 신뢰 origin만 postMessage 원천 확보.
- **[MED] 로그인 시 refresh 미보관 (followup)**: AUTH_LOGIN은 access만, refresh는 TOKEN_REFRESHED만 보관 → cold-start 세션 복원 불가. refresh를 AUTH_LOGIN에 포함하면 postMessage 노출이 커지므로(위 HIGH와 같은 표면) origin gate와 **함께 재설계**해야 함. 현재는 access만 핸드오프 + cold-start 재로그인 허용. 토큰 사용처(네이티브 API)도 후속이라 당장 영향 없음.
- **[MED] 테스트 갭 (수정 완료)**: INITIAL_SESSION→AUTH_LOGIN, TOKEN_REFRESHED-without-refresh→no-op 2 케이스 추가.
- **[LOW] 네이티브 테스트 없음 (followup)**: auth-storage(secure-store mock)/webview-screen ctx 주입 헤드리스 테스트 — mobile 검증 약함(인지). jest + expo-secure-store mock으로 키 상수/매핑 고정 추후.

리뷰 clear: provider 파생(`?? 'email'`), secure-store 옵션(WHEN_UNLOCKED 안전), 토큰 로그/URL/AsyncStorage 누출 0, cleanup·no-op 게이팅 정상.

## 남은 사항 (E 트랙)

- **실 동작 검증 = 디바이스 + 실 CLIENT_URL** (현재 placeholder `example.com`). 방금 prod 배포한 Vercel 도메인을 `apps/mobile/config/env.ts`에 반영해야 WebView가 실 웹 로드.
- **토큰 사용처**: 보관한 access 토큰을 네이티브 API Authorization 헤더로 쓰는 소비부(P1 후속).
- refresh-on-login 재설계(위 MED) · 네이티브 secure-store 테스트(위 LOW).
- E의 다른 하위: 네이티브 촬영(expo-camera + MediaMessage), 오프라인 업로드 큐.

## 게이트

web: tsc · vitest(WebViewAuthBridge 8) · build · mobile: tsc · lint green.
