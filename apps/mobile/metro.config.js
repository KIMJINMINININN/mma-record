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

// 5. Node 전용 fetch/url 라이브러리를 네이티브 번들에서 빈 모듈로 stub(근본 픽스).
//    체인: react-native-web→fbjs→cross-fetch→node-fetch→whatwg-url→webidl-conversions.
//    webidl-conversions가 로드 시 SharedArrayBuffer/ArrayBuffer.prototype.byteLength descriptor를
//    건드리는데 Hermes 비호환이라 크래시한다. RN은 글로벌 fetch/URL을 쓰므로 이들은 불필요 → empty.
//    (web 플랫폼(expo web)에선 정상 번들되도록 platform!=='web'만 stub.)
const NODE_ONLY_STUBS = new Set(['node-fetch', 'whatwg-url', 'webidl-conversions']);
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && NODE_ONLY_STUBS.has(moduleName)) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
