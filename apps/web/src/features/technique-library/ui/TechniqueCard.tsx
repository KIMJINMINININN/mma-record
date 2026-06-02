import Link from 'next/link';

import { DisciplineChip, usesBelt } from '@/entities/discipline';
import { BeltBadge } from '@/entities/rank';
import { CategoryChip, PositionChip, type Technique } from '@/entities/technique';
import { TechniqueIcon } from '@/shared/ui';

/**
 * TechniqueCard — 라이브러리 단일 기술 카드 (Design §7d 목록 카드 / F4-AC2).
 *
 * FSD 배치 결정: 이 카드는 **다중 엔티티**(technique + discipline + rank)를 조합한다.
 * entities/ 안에서 다른 entity 슬라이스를 import 하면 동일레이어(entity↔entity) 의존이
 * 되는데, 이 레포에는 그런 선례가 없다(예: DisciplineChip+session 을 쓰는 SessionCard 는
 * entities 가 아닌 widgets/day-detail 에 있음). 그래서 카드는 한 단계 위인
 * **feature 레이어**(features/technique-library/ui)에 둔다. 단일 엔티티 칩(PositionChip)만
 * entities/technique 에 남긴다. (TodoList 원문은 "entities/technique TechniqueCard" 였으나
 * FSD 정합성 우선 — 의도된 편차.)
 *
 * 카드 전체를 Next <Link> 로 감싼다(서버 컴포넌트에서 동작, 카드 자체는 비인터랙티브).
 * 표시 전용 → 서버 컴포넌트.
 */
export interface TechniqueCardProps {
  technique: Technique;
  /** 대표 썸네일(F5). 현재는 미디어 데이터가 없어 항상 placeholder. */
  thumbnailUrl?: string | null;
}

export function TechniqueCard({ technique, thumbnailUrl = null }: TechniqueCardProps) {
  const showBelt = usesBelt(technique.discipline) && technique.belt !== null;

  return (
    <Link
      href={`/techniques/${technique.id}`}
      className={[
        'group flex flex-col gap-2 rounded-m p-3',
        'border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-[var(--shadow-card)]',
        'outline-none transition-[colors,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
        'pointer-hover:-translate-y-0.5 pointer-hover:border-[var(--border-strong)] pointer-hover:shadow-[var(--shadow-e3)]',
        'focus-visible:shadow-[var(--ring-focus)]',
      ].join(' ')}
    >
      {/* 썸네일 — aspect-video. 미디어는 F5 → 데이터 없으면 항상 중립 placeholder. */}
      {/* TODO(F5): thumbnailUrl 있으면 <img>로 대표 썸네일 */}
      <div className="flex aspect-video items-center justify-center rounded-xs bg-[var(--surface-sunken)] text-[var(--text-disabled)]">
        {thumbnailUrl ? null : (
          <span className="flex flex-col items-center gap-1">
            <TechniqueIcon width={24} height={24} aria-hidden="true" />
            <span className="text-body-xs-400">영상 없음</span>
          </span>
        )}
      </div>

      {/* 이름 — 최대 2줄 truncate */}
      <p className="line-clamp-2 text-body-m-500 text-[var(--text-strong)]">{technique.name}</p>

      {/* 배지 행 1 — 종목 + (주짓수)벨트 */}
      <div className="flex flex-wrap items-center gap-1">
        <DisciplineChip discipline={technique.discipline} size="xs" />
        {showBelt && technique.belt && (
          <BeltBadge
            belt={technique.belt}
            stripes={technique.belt_stripes ?? 0}
            size="xs"
          />
        )}
      </div>

      {/* 배지 행 2 — 분류 + 포지션 */}
      <div className="flex flex-wrap items-center gap-1">
        <CategoryChip category={technique.category} size="xs" />
        {technique.position && <PositionChip position={technique.position} size="xs" />}
      </div>
    </Link>
  );
}
