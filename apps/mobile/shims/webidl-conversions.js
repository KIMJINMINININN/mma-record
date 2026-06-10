// webidl-conversions shim — React Native / Hermes 전용 (metro.config.js의 resolveRequest로 주입).
//
// 실제 webidl-conversions는 모듈 로드 시점에
//   Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, "byteLength").get
// 를 가드 없이 읽는다. Hermes엔 그 descriptor가 없어(undefined) "Cannot read property 'get' of
// undefined"로 JS 런타임이 시작 단계에서 통째로 죽는다. 반대로 빈 모듈로 stub하면 이 패키지를
// 쓰는 번들 코드(whatwg-url impl 등)가 `conversions["USVString"]`를 호출하다 "undefined is not a
// function"으로 죽는다.
//
// 네이티브 앱은 글로벌 URL/URLSearchParams·fetch를 쓰므로 진짜 WebIDL 타입 강제(coercion)가
// 필요 없다. transitive로 끌려온 whatwg-url 계열이 "크래시 없이 로드/호출"되기만 하면 충분하므로,
// 모든 변환 함수를 identity(값 그대로 반환)로 제공한다. SharedArrayBuffer는 절대 건드리지 않는다.
//
// 참고: 실제 API는 conversions.USVString(value, options) 형태로 호출되어 강제된 값을 반환한다.
// identity는 문자열/숫자/불리언 인자를 그대로 돌려주므로 URL 파싱 등 기본 동작엔 안전하다.

const identity = (value) => value;

// 알려지지 않은 어떤 변환 키(USVString, DOMString, ByteString, boolean, long, double, any ...)에도
// identity 함수를 돌려주는 Proxy. CommonJS 소비자(require)와 ESM interop(__esModule) 모두 대응.
module.exports = new Proxy(
  { __esModule: false },
  {
    get(target, prop) {
      if (prop === '__esModule') return false;
      if (prop === 'default') return module.exports;
      return identity;
    },
  },
);
