// SharedArrayBuffer 폴리필 (Hermes 대응) — Metro getPolyfills로 앱 엔트리보다 먼저 주입된다.
//
// Hermes 엔진엔 SharedArrayBuffer가 없다. 그런데 RN 안드로이드 번들에 web 계열 라이브러리
//   webidl-conversions  ← whatwg-url ← node-fetch ← cross-fetch ← fbjs ← react-native-web
// 가 섞여 들어오고, webidl-conversions가 모듈 로드 시점에
//   Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, "byteLength").get
// 처럼 SharedArrayBuffer를 가드 없이 참조 → ReferenceError: Property 'SharedArrayBuffer' doesn't exist
// 로 앱이 JS 로드 단계에서 크래시한다.
//
// 이 라이브러리들의 SharedArrayBuffer 사용은 (1) typeof 가드 비교, (2) instanceof 검사,
// (3) byteLength getter descriptor 읽기뿐이라, ArrayBuffer로 alias하면 안전하게 동작한다.
// (cross-fetch가 RN에서 글로벌 fetch가 아닌 node-fetch 경로로 번들되는 게 근인이지만,
//  의존성 해석을 건드리는 것보다 이 폴리필이 영향 범위가 작고 안전하다.)
if (typeof global.SharedArrayBuffer === 'undefined') {
  global.SharedArrayBuffer = global.ArrayBuffer;
}
