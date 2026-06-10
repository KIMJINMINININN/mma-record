// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Resolve packages from both app-local and monorepo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force strict resolution (no upward hierarchical lookup)
config.resolver.disableHierarchicalLookup = true;

// 4. SharedArrayBuffer 폴리필을 앱 엔트리보다 먼저 주입(Hermes에 없음, 방어용).
const baseGetPolyfills = config.serializer.getPolyfills;
config.serializer.getPolyfills = (...args) => [
  ...(baseGetPolyfills ? baseGetPolyfills(...args) : []),
  path.resolve(projectRoot, 'polyfills.js'),
];

// 5. transitive로 끌려온 Node 전용 fetch/url 체인을 네이티브에서 무해화한다.
//    체인: react-native-web→fbjs→cross-fetch→node-fetch→whatwg-url→webidl-conversions.
//    - node-fetch: 빈 모듈로 stub (RN은 글로벌 fetch 사용 → 불필요).
//    - webidl-conversions: shim으로 교체. 실모듈은 로드 시 SharedArrayBuffer.prototype byteLength
//      descriptor를 읽는데 Hermes엔 없어 "Cannot read property 'get' of undefined"로 죽고, 빈 모듈로
//      stub하면 이를 쓰는 코드가 `conversions["USVString"]` 호출 시 "undefined is not a function"으로
//      죽는다(둘 다 실측). shim은 모든 변환을 identity로 제공해 SharedArrayBuffer를 건드리지 않는다.
//    - whatwg-url: 실모듈 유지 (shim된 webidl-conversions로 안전하게 로드/동작).
//    (web 플랫폼(expo web)에선 정상 번들되도록 platform!=='web'만 적용.)
const WEBIDL_CONVERSIONS_SHIM = path.resolve(projectRoot, 'shims/webidl-conversions.js');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web') {
    if (moduleName === 'node-fetch') {
      return { type: 'empty' };
    }
    if (moduleName === 'webidl-conversions') {
      return { type: 'sourceFile', filePath: WEBIDL_CONVERSIONS_SHIM };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
