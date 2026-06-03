import type { SVGProps } from 'react';

/**
 * 공용 인라인 라인 아이콘 (Design §10.3 — 외부 아이콘 의존 없이 currentColor 단색).
 *
 * 모두 24x24 viewBox, `stroke="currentColor"` 기반 → 색은 부모가 텍스트색으로 제어.
 * 새 의존성 추가 금지 제약(F4 task) 준수: 직접 SVG path로 작성.
 * shared 레이어에 두어 widgets/app 어디서든 공개 API로 사용(딥임포트 회피).
 * 장식용이므로 기본 `aria-hidden` — 의미 라벨은 호출부(링크/버튼)가 제공.
 */

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  };
}

/** 캘린더 — 월간 그리드(홈, F2). */
export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

/** 기술 라이브러리 — 책/카드 스택(F4). */
export function TechniqueIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5A1.5 1.5 0 0 0 20 18.5z" />
    </svg>
  );
}

/** 검색 — 돋보기(F8). */
export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.4-4.4" />
    </svg>
  );
}

/** 프로필 — 사용자(F1). */
export function ProfileIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

/** 오늘로 — 표적/오늘 신호(상단바). */
export function TodayIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** 더하기 — 빠른 추가 FAB / "+ 추가" 버튼. */
export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** 시스템 테마 — 모니터(테마 토글: system). */
export function SystemThemeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

/** 라이트 테마 — 해(테마 토글: light). */
export function SunIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" />
    </svg>
  );
}

/** 다크 테마 — 달(테마 토글: dark). */
export function MoonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 13.5A8 8 0 0 1 10.5 4a7 7 0 1 0 9.5 9.5" />
    </svg>
  );
}

/** 뒤로 — chevron-left(상세 헤더 back). */
export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m14.5 6-6 6 6 6" />
    </svg>
  );
}

/** 통계 — 막대그래프(F10 통계 대시보드 nav). */
export function StatsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 21V11M10 21V5M16 21V8" />
      <path d="M3 21h18" />
    </svg>
  );
}

/** 재생 — 채움 삼각형(F5 영상 썸네일 클릭-재생 오버레이). currentColor 채움. */
export function PlayIcon(props: IconProps) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/** 즐겨찾기 — 빈 별(미즐겨찾기). 외곽선만(currentColor stroke). */
export function StarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 2.5l1.9 6.1 6.4 0-5.2 3.8 2 6.4-5.1-3.8-5.1 3.8 2-6.4-5.2-3.8 6.4 0z" />
    </svg>
  );
}

/** 즐겨찾기 — 채운 별(즐겨찾기됨). currentColor 채움(같은 path, fill). */
export function StarFilledIcon(props: IconProps) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="currentColor"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M12 2.5l1.9 6.1 6.4 0-5.2 3.8 2 6.4-5.1-3.8-5.1 3.8 2-6.4-5.2-3.8 6.4 0z" />
    </svg>
  );
}
