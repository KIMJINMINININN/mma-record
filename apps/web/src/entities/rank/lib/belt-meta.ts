import type { Belt } from '@/shared/model/enums';

/**
 * 벨트 표시 메타 (Design §2.5 / F9-AC1).
 * bar/barDark 는 tailwind-theme.css 의 `--color-belt-*` 토큰을 참조(SSoT 단일화).
 * dark 에서 purple/brown 만 `--color-belt-{purple,brown}-dark` 로 한 톤 ↑.
 * 값은 BeltBadge 에서 inline style 변수로 주입되어 var() 정상 해석된다.
 */
export interface BeltMeta {
  /** 한글 라벨 */
  label: string;
  /** 바(bar) 색 — light 표면 기준 (CSS var 참조) */
  bar: string;
  /** 바(bar) 색 — dark 표면 기준(purple/brown만 상향, CSS var 참조) */
  barDark: string;
}

export const BELT_META: Record<Belt, BeltMeta> = {
  white:  { label: '흰띠',   bar: 'var(--color-belt-white)',  barDark: 'var(--color-belt-white)' },
  blue:   { label: '블루',   bar: 'var(--color-belt-blue)',   barDark: 'var(--color-belt-blue)' },
  purple: { label: '퍼플',   bar: 'var(--color-belt-purple)', barDark: 'var(--color-belt-purple-dark)' },
  brown:  { label: '브라운', bar: 'var(--color-belt-brown)',  barDark: 'var(--color-belt-brown-dark)' },
  black:  { label: '블랙',   bar: 'var(--color-belt-black)',  barDark: 'var(--color-belt-black)' },
};

/**
 * 벨트별 stripe 색 (Design §2.5) — `--color-belt-stripe*` 토큰 참조.
 * - white → 흰 표면 위 stripe 는 검정(onwhite)
 * - black → 적색 바(onblack) = 실제 흑벨트 도메인 사실
 * - 그 외(blue/purple/brown) → 흰 stripe
 */
export function stripeColorFor(belt: Belt): string {
  if (belt === 'white') return 'var(--color-belt-stripe-onwhite)';
  if (belt === 'black') return 'var(--color-belt-stripe-onblack)';
  return 'var(--color-belt-stripe)';
}

const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;

/** stripes(0~4) → 로마숫자. 0은 빈 문자열. */
export function romanStripes(n: number): string {
  return ROMAN[Math.max(0, Math.min(4, n))] ?? '';
}

/**
 * 벨트 풀 라벨. stripes>0 일 때만 ' · 로마숫자' 부가.
 * 예: '블루 · II', stripes 0 이면 '블루'.
 */
export function beltFullLabel(belt: Belt, stripes?: number): string {
  const base = BELT_META[belt].label;
  const n = stripes ?? 0;
  return n > 0 ? `${base} · ${romanStripes(n)}` : base;
}
