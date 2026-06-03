import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn — shadcn/ui 컴포넌트용 className 머지 헬퍼.
 * clsx(조건부 결합) → tailwind-merge(중복 유틸 충돌 해소) 순서.
 *
 * 기존 자체 프리미티브(shared/ui/*, entities/*)는 cva의 `cx`를 계속 사용한다.
 * `cn`은 shadcn 격리 존(shared/ui/shadcn/*) 전용이다.
 *
 * ⚠️ tailwind-merge는 기본 Tailwind 스케일을 가정한다. 이 프로젝트의 커스텀
 *    유틸(text-button-*, rounded-xs 등)을 shadcn 컴포넌트에 override로 섞으면
 *    충돌 해소가 부정확할 수 있다 → 필요 시 extendTailwindMerge로 보강한다.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
