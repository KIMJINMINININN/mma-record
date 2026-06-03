/**
 * features/manage-tags 공개 API (F7-AC4 태그 관리).
 * /tags(TagsView, app)가 TagManager를 단일 진입점으로 가져다 쓴다(딥임포트 금지).
 */
export { TagManager } from './ui/TagManager';
export * from './model/tags';
