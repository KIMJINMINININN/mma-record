# F7 태그 관리 + F8 검색 패싯 — 코드리뷰 후속

> 출처: F7+F8 구현 직후 적대적 코드리뷰 워크플로우(4관점 + 검증, 2026-06-03). 19 발견 → 10 검증.
> 코어 로직·클라이언트/서버 경계·토큰 충실도는 견고 확인. 아래 확인 결함은 **이번 작업에 모두 반영**.

## ✅ 처리 완료 (이번 PR)
- **HIGH — SearchBar useSearchParams Suspense 누락**: AUTH-OFF 정적 프리렌더 빌드가 abort(프로덕션은 동적이라 가려짐). → `widgets/app-shell/TopBar.tsx`에서 `<SearchBar/>`를 `<Suspense>`로 래핑. **AUTH-OFF 빌드로 ○ Static 복귀 검증 완료.**
- **MED — 태그 집계 1000행 캡**: `fetchTags`/`fetchTagUsageCounts`/`fetchTaggedItems(taggables)`에 `.range()` 페이지네이션(F10 선례). 빈도/AND 필터 조용한 잘림 방지.
- **MED — 색 스와치 키보드/ARIA**: `role=radiogroup/radio`(키보드 미구현, 11 탭스톱) → `role=group` + `aria-pressed` 토글 버튼(DisciplinePicker 패턴, 정직하게 각자 tabbable).
- **MED — 상태변경 SR 무안내**: rename dup 에러 `role=alert` + `aria-describedby`; 인라인 삭제 confirm `role=alert` + 열 때 취소 버튼에 포커스.
- **MED — 작업 후 포커스 유실**: rename 저장/취소·색 변경 후 트리거 버튼으로 포커스 복원(rAF).
- **MED/LOW — 다크모드 ✓ 대비**: 흰 ✓가 밝은 colorDark 위 <3:1 → `light-dark(--text-on-primary, --color-gray-900)`(DisciplineChip onFill 패턴).
- **LOW — 죽은 클래스**: 스와치의 `ring-offset-*`(짝 `ring-*` 없음) 제거.
- **LOW — 터치 타깃**: 액션 버튼 `min-h-6` + 클러스터 gap 확대 + 삭제 분리(WCAG 2.5.8).
- **LOW — facets 주 시작 locale 의존**: `startOf('week')` → `d.subtract(d.day(),'day')`(weekRange/stats와 동일 일요일, locale 무관).
- **LOW — no-op rename**: 이름 미변경 시 저장 비활성(불필요 write/revalidate 방지).
- **LOW — /tags 헤딩**: 기술/세션 결과 그룹 `h2`→`h3`(h1→h2→h3 위계).
- **LOW — 패싯 변경 SR 무안내**: SearchResults에 `role=status` aria-live(결과 수/무매치).

검증: 987 테스트 · tsc · lint · build(prod + AUTH-OFF) green.

## ⬜ 의도적 미반영 / 후속
1. **F8 벨트 패싯** — `search_all` RPC가 techniques.belt를 투영하지 않아 클라 불가. RPC에 belt 컬럼 + p_belt 파라미터 추가(프로덕션 마이그레이션 + types 재생성) 필요 → 후속. (잠금 결정: 지금은 종목+기간만)
2. **F7 rename 대소문자 정책** — 클라 사전체크는 대소문자 무시, DB unique는 정확일치(divergent). 진짜 일치시키려면 `create unique index on tags (user_id, lower(name))` 마이그레이션 필요 → 후속. 현재는 보수적으로 막아 무해.
3. **F8 클라 패싯 p_limit 절단** — 패싯 활성 시 limit 100으로 상향했으나 전수 아님(상위 N만 거름). 완전 정확은 RPC 파라미터화 필요 → 후속. 문서화됨.
4. **danger 버튼 cn() 견고성**(emit-order 의존) · 색 패널 열 때 포커스 이동 · 중복 count aria-label — 미세 폴리시, 현재 동작 정상. 선택적 후속.
5. **태그 빈도/AND를 DB RPC로** — 클라 집계는 개인 규모엔 충분하나, 대규모 시 grouped-count RPC + 서버 AND가 더 정확/빠름. 후속 업그레이드 경로.
