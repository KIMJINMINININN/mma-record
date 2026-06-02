import type { ReactElement, SVGProps } from 'react';

import { DISCIPLINE_META } from '@/entities/discipline/lib/discipline-meta';
import type { Discipline } from '@/shared/model/enums';

/**
 * 종목 아이콘 (Design §2.6 / §6.2 — F9-AC2).
 * 색만으로 식별 금지(F9-AC4) → 종목별 고유 형태를 항상 동반.
 * fill/stroke 모두 `currentColor` 기반이라 부모 텍스트 색을 그대로 따른다.
 * DISCIPLINE_META.icon 키(gi-collar/rashguard/grip/glove/octagon)에 1:1 매핑되는
 * 단순·인식 가능한 인라인 SVG 5종. 외부 아이콘 라이브러리 미사용.
 */

type IconKey = (typeof DISCIPLINE_META)[Discipline]['icon'];

type GlyphProps = SVGProps<SVGSVGElement>;

/** 도복 깃 (gi-collar) — 주짓수(기) */
function GiCollarGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      {/* 좌우 라펠이 V자로 겹친 도복 깃 */}
      <path
        d="M8 2 3 5v9l2.6-1.4L8 6.4l2.4 6.2L13 14V5L8 2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** 래시가드 물결 (rashguard/wave) — 노기 주짓수 */
function RashguardGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      {/* 신축 원단의 물결 라인 3겹 */}
      <path
        d="M2 5c1.5-1.8 3-1.8 4.5 0S9.5 6.8 11 5s3-1.8 4.5 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M2 8.5c1.5-1.8 3-1.8 4.5 0s3 1.8 4.5 0 3-1.8 4.5 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M2 12c1.5-1.8 3-1.8 4.5 0s3 1.8 4.5 0 3-1.8 4.5 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 맞잡은 손 (grip) — 레슬링 */
function GripGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      {/* 서로 맞물린 두 갈고리(grip lock) */}
      <path
        d="M4 3v4a3 3 0 0 0 3 3h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 13V9a3 3 0 0 0-3-3H7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 복싱 글러브 (glove) — 타격 */
function GloveGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      {/* 둥근 주먹부 + 엄지 + 손목 밴드 */}
      <path
        d="M5 7a3 3 0 0 1 6 0v2.5a2.5 2.5 0 0 1-2.5 2.5h-1A2.5 2.5 0 0 1 5 9.5V7Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M5 8.5H3.5A1.5 1.5 0 0 1 3.5 5.5H5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5.5 12h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** 케이지 (octagon/fence) — MMA */
function OctagonGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      {/* 팔각형 케이지 윤곽 */}
      <path
        d="M5.2 2.5h5.6L14 5.7v4.6L10.8 13.5H5.2L2 10.3V5.7L5.2 2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

const GLYPH_BY_KEY: Record<IconKey, (props: GlyphProps) => ReactElement> = {
  'gi-collar': GiCollarGlyph,
  rashguard: RashguardGlyph,
  grip: GripGlyph,
  glove: GloveGlyph,
  octagon: OctagonGlyph,
};

export interface DisciplineIconProps extends GlyphProps {
  discipline: Discipline;
}

/**
 * 종목 → 인라인 SVG 아이콘. 색은 currentColor를 따르므로
 * 부모(칩)에서 text 색만 지정하면 된다.
 */
export function DisciplineIcon({ discipline, ...props }: DisciplineIconProps) {
  const Glyph = GLYPH_BY_KEY[DISCIPLINE_META[discipline].icon as IconKey];
  return <Glyph {...props} />;
}
