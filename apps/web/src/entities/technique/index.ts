export * from './model/technique';
export * from './api/technique-queries';
export * from './lib/category-meta';
export * from './lib/position-meta';
export * from './ui/CategoryChip';
export * from './ui/PositionChip';
// 주: TechniqueCard 는 다중 엔티티(technique+discipline+rank)를 조합하므로
//     entity→entity 동일레이어 의존을 피해 features/technique-library 로 배치한다(FSD 결정).
