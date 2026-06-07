module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets/plugin 은 reanimated v4/worklets 필수 + 반드시 마지막 플러그인.
    // 누락 시 worklets 런타임 초기화 실패(SharedArrayBuffer ReferenceError 등).
    plugins: ['react-native-worklets/plugin'],
  };
};
