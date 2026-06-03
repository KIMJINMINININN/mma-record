# F10 통계 대시보드 — 코드리뷰 후속 결함 (나중에 처리)

> 출처: F10 구현 직후 적대적 코드리뷰 워크플로우(4관점 + 검증, 2026-06-03). 총 18 발견 → 6 검증.
> 코어 집계 로직·FSD 레이어링·디자인 토큰 충실도는 **결함 없음**으로 확인됨.
> 사용자 요청으로 **HIGH만 즉시 수정**, 나머지는 이 문서로 미뤄둠(F2 먼저 진행).

## ✅ 처리 완료 (HIGH)
- **무제한 SELECT가 PostgREST 1000행 캡에서 조용히 잘림** — `entities/session/api/stats-queries.ts`.
  `fetchAllSessionStatRows`/`fetchTopTechniques`를 `.range()` 루프로 전 페이지 모으도록 수정(안정 정렬 추가).
  config.toml `max_rows=1000`, session_techniques는 세션당 다중행이라 ~250세션이면 도달해 합계/랭킹이 왜곡되던 버그. 커밋 시 포함.

## ✅ 처리 완료 — MED (2026-06-03 후속)
1. **FrequencyChart `role="tablist"`가 무효 ARIA 패턴** (`widgets/stats/ui/FrequencyChart.tsx:53-76`)
   → **완료**: `role="radiogroup"` + `role="radio"`/`aria-checked`로 교체(화살표 키 유지). 차트 컨테이너 `role="img"` 제거, sr-only 요약을 `aria-live="polite"`(요약+버킷)로 일원화해 토글 시 안내. 테스트도 radio/aria-checked/getByText로 갱신.
   - tabpanel/`aria-controls` 없이 tab만 선언 → APG 위반. 차트는 단일 영역 재렌더라 tab이 아님.
   - **Fix**: `role="radiogroup"` + 버튼 `role="radio"` + `aria-checked`(현 `aria-selected` 대체). 화살표 키 핸들러 유지.
   - 토글 시 SR 무안내 문제도 함께: sr-only 요약 `<p>`를 `aria-live="polite"`로(아래 LOW와 동일 수정). chart div의 `role="img"`는 제거하고 sr-only live p로 일원화.
   - ⚠️ `FrequencyChart.test.tsx`의 `getByRole('tab'…)`/`aria-selected`/`role="img"` 단언을 `radio`/`aria-checked`/`getByText` 로 갱신해야 함.

## ✅ 처리 완료 — LOW (2026-06-03 후속)
모두 반영됨: (2) stats-screen에 `isError` 분기(에러+재시도, 빈상태와 분리) · (3) FrequencyChart `aria-live` 요약(MED #1과 통합) · (4) TopTechniquesList 행 `pointer-hover:` · (5) 터치 타깃(탭 `py-1.5`, 더보기 `min-h-9 px-2`) · (6) StreakDisplay aria-label에 `오늘 기록함/미기록` 추가 · (7) stats/streakDays `useMemo` · (8) 로딩 분기 `aria-busy` · (9) today 주석 "브라우저 로컬 기준" 명시. 검증: 905 테스트·tsc·lint·build green.

<details><summary>원본 항목 상세</summary>

2. **페치 실패가 '아직 기록이 없어요' CTA로 위장** (`app/(app)/stats/stats-screen.tsx:43-66`)
   - 에러 시 data=undefined→rows=[]→stats=null→신규유저 빈상태 렌더. (전역 토스트로 에러는 표면화되나 본문이 오해 소지 + 잘못된 세션에디터 CTA)
   - **Fix**: isPending 분기 다음에 `if (sessionsQuery.isError || techniquesQuery.isError) return <EmptyState title="통계를 불러오지 못했어요" … action={재시도 refetch}/>`. (calendar-screen 관행과는 다름 — 일관성 택하면 status quo 유지 가능)
3. **토글 시 SR 무안내** (`FrequencyChart.tsx:80-84,129`) — MED #1과 합쳐 `aria-live="polite"`로 해결. calendar-screen.tsx:101 선례.
4. **TopTechniquesList 행 hover가 `hover:` (pointer-hover 아님)** (`TopTechniquesList.tsx:43`) — `pointer-hover:bg-[var(--surface-sunken)]`로(터치 sticky-hover 방지, 프로젝트 관행).
5. **터치 타깃 작음** (`FrequencyChart.tsx:68` 탭 `py-1`, `TopTechniquesList.tsx:74` 더보기 `px-1 py-0.5`) — WCAG 2.5.8(24px) 위해 `py-1.5`/`min-h` 보강.
6. **스트릭 점 행 aria-label에 오늘 상태 누락** (`StreakDisplay.tsx:42-56`) — aria-label 끝에 `, 오늘 ${todayTrained?'기록함':'미기록'}` 추가(테스트 단언도 갱신).
7. **stats/streakDays 매 렌더 재계산** (`stats-screen.tsx:43-71`) — `useMemo([rows, today])`로 메모이제이션.
8. **클라이언트 로딩 분기에 aria-busy 없음** (`stats-screen.tsx:55-57`) — isPending 브랜치를 `<div aria-busy="true" aria-label="통계 로딩 중">`로 감싸기(loading.tsx와 정합).
9. **`today`가 브라우저 로컬 tz 기준**(`stats-screen.tsx:30`) — KST-only 청중엔 허용. 주석에 "브라우저 로컬 기준" 명시 권장. 비-KST 지원 시 KST 보정 helper.

</details>

## 검토 후 의도적 미반영(결함 아님)
- 빈도 막대 goal-met 빨강 = 색 단독 인코딩? → **점선 목표선 대비 막대 높이(위치)** 가 비-색 인코딩으로 이미 존재 → OK.
- 헤어로 카드 라벨 `<p>`(h2 아님) → 화면 h1 + 섹션 h2 위계로 충분, 구조 변경 리스크 회피.
- StatsContent 'server-render 가능' 주석 → 현재 클라이언트 섬 안에서만 렌더(문서 nit).
- loading.tsx가 widgets/stats 배럴 import → 동작 무해(딥임포트 최적화는 선택).
- today useMemo가 자정 롤오버 미반영 → all-time 화면이라 허용.
