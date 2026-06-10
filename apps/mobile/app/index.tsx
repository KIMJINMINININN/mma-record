import { Redirect } from 'expo-router';

// 루트(/) 진입점. 앱의 유일/기본 surface는 web 탭(WebView)이므로 즉시 리다이렉트한다.
// dev-client가 `rnappdev:///`(경로 /)로 실행하거나 콜드런치 시 `/`가 매칭되지 않아
// expo-router의 "Unmatched Route" 화면이 뜨던 문제를 방지한다(인덱스 라우트 부재 보강).
export default function Index() {
  return <Redirect href="/web" />;
}
