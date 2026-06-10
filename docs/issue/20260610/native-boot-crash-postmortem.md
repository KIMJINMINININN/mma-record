# 모바일 네이티브 부팅 크래시 — 원인 분석 & 조치 (2026-06-10)

> 한 줄 요약: EAS preview/로컬 빌드가 **앱 시작 즉시 크래시**(WebView 도달 전)하던 문제.
> 뿌리는 `webidl-conversions`(transitive)가 Hermes와 충돌 + `metro.config.js`의 stub 처리.
> **fix 커밋: `4534fe3`** (`feat/stats-dashboard-calendar-views`).

---

## 1. 증상

- EAS preview APK(릴리즈)·로컬 빌드 모두 **켜자마자 종료**. WebView 화면이 뜨기 전 사망.
- 화면에 보이던 **"error loading page"는 MatLog가 아님** — MatLog는 즉시 꺼지고, 포그라운드에 남아있던 다른 앱(`com.ajnetworks.platform`)이 보인 것. (logcat의 `topResumedActivity`로 확인)
- 이 네이티브 앱이 **실기기/에뮬에서 한 번도 정상 부팅된 적 없던 잠복 버그**. 웹앱(Vercel)은 정상이었고 네이티브 셸 부팅 검증이 이번이 처음이었음.

### 관측된 크래시 (logcat)
릴리즈(EAS) 빌드 — Hermes 번들, 첫 렌더:
```
TypeError: undefined is not a function   (isComponentError: true)
  has@1:537730
  getRouteInfoFromState        (expo-router)
  getCachedRouteInfo
  setFocusedState
  BaseRoute                    (컴포넌트 트리 첫 렌더)
→ Process com.anonymous.rn_app_dev has died
```
로컬 디버그 빌드 — 읽을 수 있는(non-minified) 에러:
```
[runtime not ready]: TypeError: conversions["USVString"] is not a function (it is undefined)
→ Invariant Violation: "main" has not been registered
```

---

## 2. 근본 원인

앱 소스는 `react-native-webview`만 import하지만, 의존성 트리에서 **Node 전용 URL/fetch 체인**이 네이티브 번들로 유입됨:

```
react-native-web → fbjs → cross-fetch → node-fetch → whatwg-url → webidl-conversions
```

`webidl-conversions`가 Hermes와 충돌하는데, `metro.config.js`의 stub 처리가 **어느 쪽으로 해도 죽는** 구조였음:

| metro 설정 | 결과 | 메시지 |
|---|---|---|
| **빈 모듈로 stub** (기존) | 이를 쓰는 코드(whatwg-url impl)가 `conversions.USVString()` 호출 → 빈 객체엔 없음 | `undefined is not a function` |
| **실모듈로 로드** | 로드 시 `Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype,"byteLength").get` 읽음 → Hermes엔 descriptor가 **없어**(undefined) → `.get` 접근 실패 | `Cannot read property 'get' of undefined` |

→ 어느 경우든 **JS 런타임이 `main` 등록 전에 사망**. 릴리즈 빌드에선 번들 구조 차이로 expo-router `getRouteInfoFromState`의 `has()` 호출에서 표면화돼 "첫 렌더 크래시"로 보였을 뿐, 동일한 뿌리.

### 왜 polyfill이 있는데도 죽었나
기존 코드엔 SharedArrayBuffer 대응 장치가 **둘** 공존:
1. `polyfills.js`: `global.SharedArrayBuffer = global.ArrayBuffer` (엔트리보다 먼저 주입)
2. `metro.config.js`: `node-fetch`/`whatwg-url`/`webidl-conversions`를 빈 모듈로 stub

(1)만으론 Hermes의 `ArrayBuffer.prototype.byteLength` **descriptor 부재**를 못 메워서 (2)에 의존했는데, (2)가 오히려 런타임을 깨뜨림. 즉 두 장치가 같은 문제를 중복 대응하다 충돌.

---

## 3. 조치 (커밋 `4534fe3`)

핵심: **webidl-conversions를 크래시 없이 무해화**.

### ① `apps/mobile/shims/webidl-conversions.js` (신규) — 진짜 픽스
모든 변환 함수를 **identity(값 그대로 반환)**로 제공하는 shim. **SharedArrayBuffer를 절대 건드리지 않음.**
- 네이티브 앱은 글로벌 `URL`/`URLSearchParams`/`fetch`를 쓰므로 진짜 WebIDL 강제가 불필요 → identity로 충분.
- `conversions.USVString(x)` → `x` (호출해도 안 죽음), 로드 시 SharedArrayBuffer 미접근 (로드해도 안 죽음). **양쪽 크래시 동시 제거.**

### ② `apps/mobile/metro.config.js` — shim 연결
```js
const WEBIDL_CONVERSIONS_SHIM = path.resolve(projectRoot, 'shims/webidl-conversions.js');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web') {
    if (moduleName === 'node-fetch') return { type: 'empty' };
    if (moduleName === 'webidl-conversions') {
      return { type: 'sourceFile', filePath: WEBIDL_CONVERSIONS_SHIM };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};
```
- `webidl-conversions` → shim 해석
- `whatwg-url` → **실모듈로 복원** (shim된 conversions로 안전 동작)
- `node-fetch` → 빈 모듈 stub 유지 (RN은 글로벌 fetch 사용)

### ③ `apps/mobile/app/index.tsx` (신규) — 라우팅 보강
크래시 해소 후 expo-router **"Unmatched Route"**가 드러남(루트 `/`에 매칭 라우트 없음 — `/web`·`/modal`·`/webview`만 존재). 루트 → `/web` 리다이렉트 추가:
```tsx
import { Redirect } from 'expo-router';
export default function Index() {
  return <Redirect href="/web" />;
}
```
dev-client(`rnappdev:///`)·콜드런치 모두 안착.

### ④ `expo install --fix` — 의존성 정렬
SDK 54와 어긋난 버전 교정:
- `expo-application` **55.0.14 → 7.0.8** (메이저 48 차이, 명백한 오류 버전)
- `expo-device` **55.0.15 → 8.0.10**
- `expo-router` 6.0.23 → 6.0.24, `@react-native-community/netinfo` 12 → 11.4.1, `expo` 54.0.33 → 54.0.35 등
- 부수: `app.json`에 RECORD_AUDIO 권한 · expo-font/expo-web-browser 플러그인 · `extra.eas.projectId` 동기화

---

## 4. 검증

로컬 디버그 빌드(`npx expo run:android`) → 에뮬레이터(`Medium_Phone_API_36.1`) 실측:
- ✅ JS 크래시 **0건** (`undefined is not a function` / `Cannot read property` 소멸)
- ✅ expo-router 정상 네비게이션 (`/` → `/web`)
- ✅ WebView가 **실제 Vercel 웹앱** 로드 → 루트 307 → `/calendar` → **6월 캘린더 풀 UI 렌더**

### 디버깅에 쓴 핵심 기법 (재현용 메모)
- `adb logcat`에서 `ReactNativeJS` / `componentStack` / 풀 JS 스택 확보 (필터링 시 throw 지점 잘리지 않게 주의)
- **릴리즈는 minified → 디버그 빌드로 readable 스택** 확보가 결정적이었음
- `expo install --check`로 버전 드리프트 탐지
- EAS 릴리즈 설치 위 디버그 설치 시 **서명 불일치**(INSTALL_FAILED_UPDATE_INCOMPATIBLE) → 기존 앱 uninstall 필요
- 디버그 빌드는 JS를 Metro에서 받음 → metro.config 변경 시 **Metro 재시작 + `--clear`** 필요

---

## 5. 후속 / 주의

| 항목 | 내용 |
|---|---|
| **EAS는 git에서 빌드** | `4534fe3` 커밋됨 → 새 preview APK에 반영됨 |
| **보안 게이트** | 디버그=`develop`이라 `useSecurityModule` 스킵. **EAS preview=`production`**이라 루팅/Play Integrity 검사 실행 → 에뮬·사이드로드에선 차단 가능 → **실기기**(+가능하면 내부 테스트 트랙)에서 검증 |
| **다음** | `eas build -p android --profile preview` 재빌드 → 실기기 설치 → 런북 체크리스트(촬영·갤러리·HEIC·오프라인 큐·E-AUTH). 런북: `docs/issue/20260605/eas-build-runbook.md` |
| **교훈** | `metro.config.js`의 `resolveRequest` stub은 함부로 건드리지 말 것 — Node-only 라이브러리의 transitive 유입은 "빈 모듈 stub"이 아니라 **무해 shim**으로 처리해야 안전 |
