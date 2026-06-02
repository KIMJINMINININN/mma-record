import type { ClassType } from '@/shared/model/enums';

/**
 * 수업 유형(class_type) 한글 라벨 (PRD F2/F3 / Design §7b).
 * enums.ts `CLASS_TYPES`와 키가 1:1 — 한쪽 변경 시 같은 PR에서 동시 수정.
 * 세션 카드 헤더("드릴 · 60분 · …")의 유형 텍스트로 사용.
 */
export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  technique: '기술',
  drilling: '드릴',
  sparring: '스파링',
  open_mat: '오픈매트',
  private: '프라이빗',
  seminar: '세미나',
  competition: '시합',
  strength: '근력',
};

/**
 * 강도(1~5)를 5단계 점 표현용 채움/비움 불리언 배열로 변환 (Design §7b 강도 ●●●○○).
 * 입력은 0~5로 클램프 — null/미입력은 호출부에서 0으로 넘긴다.
 *
 * @example intensityDots(3) → [true, true, true, false, false]
 */
export function intensityDots(intensity: number): boolean[] {
  const n = Math.max(0, Math.min(5, Math.trunc(intensity)));
  return Array.from({ length: 5 }, (_, i) => i < n);
}
