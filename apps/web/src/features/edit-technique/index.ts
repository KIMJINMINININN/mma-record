/**
 * features/edit-technique 공개 API (F4-AC1).
 * createTechnique / updateTechnique Server Actions + 결과 타입.
 * widgets(technique-editor)는 이 배럴만 import 한다(딥임포트 금지).
 */
export { createTechnique, updateTechnique, type TechniqueActionResult } from './api/technique-actions';
