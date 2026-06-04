# C: F8 벨트 패싯 — 후속 (2026-06-04)

> 🟡 백로그 C(마이그레이션 동반). search_all RPC에 belt 투영(0019) + 클라 belt 패싯. f7-f8 deferred 항목 해소.

## 무엇

검색 패싯에 **벨트** 추가. 기존 discipline/period 패싯은 클라 필터(RPC subtitle 파생, 대칭 규칙)였는데, belt는 search_all이 belt를 투영하지 않아 불가능했음(f7-f8 deferred). → **0019로 belt 투영** + discipline과 동일한 클라 패싯.

## 구현

- **0019_search_all_belt.sql**: search_all RETURNS TABLE에 `belt text` 추가. RETURNS 변경이라 `drop function`+`create`(create or replace 불가). technique=`t.belt::text`, session/tag=`null::text`. 시그니처(text,int) 유지 → search-all.ts 호출부 무변경. p_belt 서버 파라미터는 두지 않음(클라 필터 일관). grant 재실행.
- **클라 패싯**: SearchResult.belt(string|null) + search-all.ts 매핑. facets.ts SearchFacets.belt + applyFacets belt **대칭 규칙**(technique 행만 belt 제약; belt=null 비주짓수 technique은 belt 선택 시 제외; session/tag 통과). search-params belt URL parse/build(BELTS 화이트리스트). SearchFacetBar belt select(BELT_META label). page.tsx searchParams belt.
- types.ts search_all Returns belt: string 수동 반영(기존 subtitle/title 패턴 일관).

## 적대적 리뷰 (code-reviewer opus) — APPROVE, 확정 결함 0

- 0019 SQL: union all 3 select 컬럼 순서/개수/타입(belt 슬롯5) RETURNS와 정확 일치, drop+create 정당(RETURNS 변경), grant 재발급, 0012 무회귀(where/rank/order/trigram 동일) — **모든 축 CLEAN**.
- belt 대칭 규칙: technique만 제약·null-belt 제외·discipline+belt AND — 테스트로 검증.
- 거짓 커버리지 없음(belt applyFacets/parse/build/select 진짜 단언).

## LOW (미반영, 후속/배포 시)

- **[LOW] types.ts belt: string vs string|null** — belt는 실제 nullable(session/tag/비주짓수→null)인데 types는 `string`(기존 subtitle/title 패턴 일관, 회귀 아님; search-all.ts 경계에서 string|null로 재좁힘 → 런타임 안전). 단 **db:types no-op이 이 함수 shape엔 미검증** — search_all은 스키마 유일 RETURNS TABLE 함수. Postgres가 RETURNS TABLE 컬럼을 nullable로 보고하므로 재생성 시 `belt: string | null`(+ subtitle/title flip) 가능. **배포 액션**: 0019 적용 후 `pnpm web db:types` diff 확인 → 산출물에 맞춰 수동분 조정(no-op 아니면 그 산출물 채택).
- **[LOW] belt 패싯 UX** — BJJ 전용 belt를 전 종목 검색에 노출. 비주짓수 종목 + belt 선택 시 technique 0(belt=null 제외) → empty-state로 완화되나, discipline=비주짓수 + belt 조합은 surprising 가능. discipline 패싯 미러 패턴이라 일관. 폴리시 옵션(후속): 비주짓수 discipline 선택 시 belt select disable, 또는 "벨트(주짓수)" 라벨.

## 배포 순서 (⚠ 마이그레이션)

0019는 RPC 변경 — 코드 배포 **전에** prod 적용 필수(미적용 시 search_all이 belt 없이 반환 → search-all.ts `row.belt` undefined). `db:push`(0017/0018/0019) → **db:types diff 확인(위 LOW)** → 코드 배포. 미적용이어도 검색 자체는 동작(belt 패싯만 무효).

검증: 1087 tests(+4) · tsc · lint · build(AUTH-OFF ○ Static) green.
