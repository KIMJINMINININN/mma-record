# F4 비그래플링 level — 코드리뷰 후속

> 출처: F4 level(기술 레벨 적합도) 구현 직후 적대적 코드리뷰 워크플로우(4관점 + 발견별 회의적 검증, 2026-06-03).
> 6 발견 → **2 확정 / 4 기각**. 코어 데이터흐름(SSoT enums↔SQL↔types · belt↔level 상호배타 · 필터/칩)은 견고 확인.
> 스코프: 비벨트 종목(레슬링·타격·MMA) 기술에 입문/중급/고급 level 적합도(belt 적합도의 비벨트 대응).
> 내부값 ascii(`beginner/intermediate/advanced`, SQL enum `skill_level`), UI는 `LEVEL_META` 한글 라벨.

## ✅ 처리 완료 (이번 작업)
- **LOW(correctness) — 카드/상세 belt↔level 게이팅 불일치**: `TechniqueCard` 가 level 을 `!showBelt`(belt **유무**)로 게이팅 → belt=null 인 주짓수 행에 stray level 이 있으면 카드만 LevelChip 을 띄워 상세/폼과 표면 간 불일치. (현재는 폼이 유일 writer라 도달 불가 + 시드도 미기입이라 잠재.) → 카드도 `!usesBelt(discipline)` **종목** 술어로 통일(상세/폼과 동일). 이제 세 표면이 같은 불변식.
- **MED(migration-deploy) — 배포 순서 런북 누락**: 0017은 **컬럼 추가** 마이그레이션이라 코드보다 먼저 적용해야 하는데(미적용 시 기술 생성/편집 insert/update가 PGRST204로 실패, 읽기는 안전) `VERCEL_DEPLOY.md`엔 명시가 없었음(CI도 마이그레이션 미적용 — 빌드는 `next build`뿐). → (1) 런북 0001~0016→**0017** 갱신(§4c·부록), (2) **§5-0 선적용 단계** 신설(`db:push`→컬럼 확인→`db:types`→코드 배포), (3) `0017_technique_level.sql` 헤더에 배포 순서 경고 코멘트.

검증: 1028 테스트 · tsc --noEmit · lint · build(AUTH-OFF ○ Static) green.

## ⬜ 의도적 미반영 / 기각 (검증으로 false-positive·트레이드오프 확인)
1. **`LEVEL_META` raw-hex vs 테마 토큰** — 기각. `discipline-meta.ts` 도 이미 raw-hex 를 inline 주입하는 **기존 관례**(3개 중 2개가 hex; belt만 토큰). LevelChip 은 discipline 관례와 정합 + 의도가 문서화됨(level-meta.ts §11-13). *주: 검증자가 짚은 정정 — 테마 파일의 미커밋 부분은 `--spacing` 한 줄뿐이고 `--color-disc-*` 토큰은 이미 커밋돼 있어, 원하면 `--color-level-*` 토큰화도 가능. 현 raw-hex도 내부 정합·동작 정상이라 유지, 토큰화는 선택적 후속.*
2. **techniques.level(enum) vs user_ranks.level(text) 표현 불일치** — 기각. 서로 다른 축(기술 난이도 vs 사용자 개인 랭크) + 0017에 분리 의도 명시. 게다가 user_ranks.level은 실제로 **한글**('입문'…)을 저장(ProfileRankEditor) → ascii enum과 통합하려면 동작 변경 데이터 마이그레이션 필요(별 기능). F4 미접촉. 선택적 후속.
3. **belt↔level 스키마 강제(zod superRefine / DB CHECK)** — 미반영. 진짜 불변식은 discipline 기반이라 스키마에서 강제하려면 technique 모델이 `@/entities/discipline` 를 import → **FSD entity↔entity 결합** 발생(레포가 회피하는 패턴). 폼이 유일 writer로 이미 강제 + 세 표면 술어 통일로 표시 일관성 확보 → 비용 대비 가치 낮아 보류.
4. **pre-migration 쓰기 실패 범위(전 기술 쓰기, BJJ level:null 포함)** — 기각(코드 변경 불필요). #2 배포 순서 위험의 재진술 — 런북 선적용 단계로 커버됨.
5. **0017 비멱등(IF NOT EXISTS 없음)** — 기각. 16개 선행 마이그레이션 전부 무가드(Supabase `schema_migrations` 원장이 재적용 방지) — 0017만 가드 추가는 일관성 해치는 무의미 변경.
