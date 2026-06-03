/**
 * 태그 색상 큐레이티드 팔레트 (F7-AC4 / PRD §F7).
 *
 * tags.color 에는 이 팔레트의 **키**(예: 'teal')를 저장한다(자유 hex 아님 — 다크모드/대비 안전).
 * 렌더는 DisciplineChip 관용구와 동일하게 light-dark(color, colorDark)를 인라인 스타일로 적용
 * (별도 CSS 토큰 불필요 — DISCIPLINE_META처럼 meta hex가 렌더 SSoT). 10색 모두 브랜드 빨강(#e11d2a)과
 * 종목색(#1d4ed8/#0e7490/#b45309/#c2410c/#5b21b6)과 구분된다.
 * 색은 단독 식별 수단이 아니다(F9-AC4) — 항상 '#name' 텍스트와 색상 라벨(aria)이 함께 표시된다.
 *
 * 읽기 관용: 저장값이 알 수 없는 값(레거시 hex 등)이면 resolveTagColor가 null 반환(점 없음, 예외 없음).
 */

export interface TagColorMeta {
  key: TagColorKey;
  label: string;
  /** light 표면 기준 색 */
  color: string;
  /** dark 표면 기준 한 톤 밝은 색 */
  colorDark: string;
}

/** 팔레트 키 순서(스와치 그리드 표시 순서이자 SSoT). */
export const TAG_COLOR_KEYS = [
  'slate',
  'rose',
  'amber',
  'lime',
  'emerald',
  'teal',
  'sky',
  'indigo',
  'violet',
  'fuchsia',
] as const;

export type TagColorKey = (typeof TAG_COLOR_KEYS)[number];

export const TAG_COLOR_META: Record<TagColorKey, TagColorMeta> = {
  slate:   { key: 'slate',   label: '슬레이트', color: '#475569', colorDark: '#94a3b8' },
  rose:    { key: 'rose',    label: '로즈',     color: '#be185d', colorDark: '#f472b6' },
  amber:   { key: 'amber',   label: '앰버',     color: '#a16207', colorDark: '#fbbf24' },
  lime:    { key: 'lime',    label: '라임',     color: '#4d7c0f', colorDark: '#a3e635' },
  emerald: { key: 'emerald', label: '에메랄드', color: '#047857', colorDark: '#34d399' },
  teal:    { key: 'teal',    label: '청록',     color: '#0f766e', colorDark: '#2dd4bf' },
  sky:     { key: 'sky',     label: '스카이',   color: '#0369a1', colorDark: '#38bdf8' },
  indigo:  { key: 'indigo',  label: '인디고',   color: '#4338ca', colorDark: '#818cf8' },
  violet:  { key: 'violet',  label: '바이올렛', color: '#7c3aed', colorDark: '#a78bfa' },
  fuchsia: { key: 'fuchsia', label: '푸시아',   color: '#a21caf', colorDark: '#e879f9' },
};

/** color 값이 유효한 팔레트 키인지(런타임 가드 — DB 자유 text 컬럼 방어). */
export function isTagColorKey(value: string | null | undefined): value is TagColorKey {
  return value != null && value in TAG_COLOR_META;
}

/** 저장값 → 팔레트 메타(라벨/색). 유효 키가 아니면 null(점 없음, 예외 없음). */
export function resolveTagColor(stored: string | null | undefined): TagColorMeta | null {
  return isTagColorKey(stored) ? TAG_COLOR_META[stored] : null;
}

/** 메타 → CSS light-dark() 색 문자열(인라인 style용). */
export function tagColorCss(meta: TagColorMeta): string {
  return `light-dark(${meta.color}, ${meta.colorDark})`;
}
