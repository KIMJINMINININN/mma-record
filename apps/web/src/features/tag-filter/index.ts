/**
 * features/tag-filter 공개 API (F7).
 * TagInput(자동완성 입력 + AND 필터 바) + 순수 태그 이름 helpers.
 * widgets(session-editor)·app((app)/tags)는 이 배럴만 import 한다(딥임포트 금지).
 */
export { TagInput, type TagInputProps } from './ui/TagInput';
export {
  normalizeTagName,
  tagKey,
  addTag,
  removeTagAt,
  filterSuggestions,
  DEFAULT_MAX_TAGS,
} from './model/tags';
