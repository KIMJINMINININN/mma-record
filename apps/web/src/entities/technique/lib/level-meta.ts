import type { Level } from '@/shared/model/enums';

/**
 * 기술 레벨 표시 메타 (F4 P1 / PRD §3 — 비벨트 종목 입문/중급/고급).
 *
 * 색은 단일 톤(emerald) 진행 램프 — 강도↑ = 레벨↑(belt 흰→검 진행과 같은 은유).
 *   - light 표면: 입문=옅은 채움/짙은 글자 → 고급=짙은 채움/옅은 글자
 *   - dark  표면: 입문=짙은 채움 → 고급=밝은 채움 (대비 보존)
 * 모든 칸 텍스트 대비 ≥4.5:1 (F9 — 색은 보조, 라벨이 의미를 보장).
 *
 * 값은 LevelChip 에서 inline style 변수(--level-*)로 주입되고 `dark:` 변형으로 스왑된다
 * (BeltBadge 의 --belt-bar 주입과 동일 관용구). tailwind-theme.css 토큰을 쓰지 않는 이유:
 * 색이 이 한 곳(LEVEL_META)에 응집되어 SSoT 가 유지되고, 테마 CSS 미수정으로 슬라이스 자족성↑.
 */
export interface LevelMeta {
  /** 한글 라벨(입문/중급/고급) */
  label: string;
  /** 채움색 — light 표면 */
  bg: string;
  /** 채움색 — dark 표면 */
  bgDark: string;
  /** 글자색 — light 표면 */
  fg: string;
  /** 글자색 — dark 표면 */
  fgDark: string;
}

export const LEVEL_META: Record<Level, LevelMeta> = {
  beginner:     { label: '입문', bg: '#d1fae5', bgDark: '#064e3b', fg: '#065f46', fgDark: '#a7f3d0' },
  intermediate: { label: '중급', bg: '#34d399', bgDark: '#047857', fg: '#064e3b', fgDark: '#d1fae5' },
  advanced:     { label: '고급', bg: '#065f46', bgDark: '#6ee7b7', fg: '#ecfdf5', fgDark: '#022c22' },
};
