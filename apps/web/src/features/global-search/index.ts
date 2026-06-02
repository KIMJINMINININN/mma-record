/**
 * features/global-search 공개 API (F8 / Develop §0012).
 * `/search` (app) RSC가 server util(searchAll) + 그룹 결과 UI(SearchResults) +
 * 모델(타입/그룹화/경로)을 단일 진입점으로 가져다 쓴다(딥임포트 금지).
 */
export { searchAll } from './api/search-all';
export { SearchResults, type SearchResultsProps } from './ui/SearchResults';
export {
  groupResults,
  resultHref,
  type SearchResult,
  type GroupedResults,
} from './model/search';
