# F2 캘린더(주/아젠다 + 인-타일 퀵애드) — 코드리뷰 후속 (나중에)

> 출처: F2 구현 직후 적대적 코드리뷰 워크플로우(4관점 + 검증, 2026-06-03). 21 발견 → 7 검증.
> **HIGH 없음.** 코어 데이터/FSD/쿼리 무효화/딥링크/인-타일 + 안전성 모두 정상 확인.

## ✅ 처리 완료 (이번 작업에 포함)
- **MED — 크로스모드 날짜 desync (2건, 동일 근원)**: 월/아젠다 네비가 `activeStartDate`만 옮기고 `selectedDate`는 안 옮겨 (a) 월→주 전환 시 엉뚱한 주, (b) 월 그리드↔DayDetail 달 불일치(선택 링 소실). → `shiftMonth`가 두 포인터를 함께 이동(선택일을 새 달 같은 일자로 클램프). `calendar-screen.tsx`.
- **LOW — 헤딩 h1→h3 점프**: 주/아젠다 날짜 헤더 `h3`→`h2` (월 뷰 DayDetail은 이미 h2). `CalendarWeekView`/`CalendarAgendaView` + 테스트 갱신.
- **LOW — tabpanel 비포커스**: `role=tabpanel`에 `tabIndex={0}` + `outline-none`. `calendar-screen.tsx`.
- **LOW — 비활성 탭 텍스트 대비** (라이트 4.4:1<4.5): `--text-muted`→`--text-default`. `calendar-screen.tsx`.
- **LOW — 주 '기록 없음' 대비/보더 토큰**: `--text-disabled`(≈2.86:1)→`--text-muted`, 보더 `--border-subtle`→`--border-default`(아젠다/DayDetail과 통일). `CalendarWeekView`.
- **랜드마크 노이즈**: 주/아젠다 날짜 블록 `<section aria-label>`(7 region)→`<div>`(h2가 구조 제공). 두 파일.

## ⬜ 미처리 — LOW (선택)
1. **아젠다 뷰에 날짜별 추가 버튼 없음** (주 뷰는 날짜마다 AddSessionButton 있음) — 키보드/SR이 아젠다에서 특정 날짜에 바로 추가 불가(상단 '세션' 버튼은 selectedDate 프리셋). 추가 시 AgendaView가 zustand 스토어에 결합 → 테스트에 스토어 mock 필요. 아젠다는 복습 지향이라 보류. `CalendarAgendaView.tsx`.
2. **fetchDaySessions/fetchRangeSessions 셀렉트+평탄화 중복** (드리프트 위험) — `SESSION_EMBED_SELECT` const + `mapSessionRow`로 추출 권장(인라인 유지 시 추론 보존). 현재 "동일 셀렉트" 주석만. `calendar-queries.ts`.
3. **range 쿼리(주/아젠다) PostgREST 1000행 캡 무가드** — 월/주 범위는 현실적으로 <1000이라 무해. 방어 시 `.limit(1000)` 명시 또는 아젠다는 trained_on DESC 정렬로 최신 우선. `calendar-queries.ts`.
4. **주 쿼리 키가 weekStartISO만** — `end=start+6` 불변식에 의존. 자기설명 위해 키에 endISO 포함 또는 주석. 저우선.
5. **활성 탭 shadow-e1 다크모드서 거의 안 보임** — 다크 대응 `shadow-[var(--shadow-card)]`로 교체 검토(기능 무관, 표면+텍스트로 이미 구분).
6. **주 뷰 today 빨강 이중**(날짜 숫자 빨강 + '오늘' 칩) — 숫자는 `--text-strong`로 두고 '오늘' 칩만 빨강 신호로 단일화 검토.
7. **aria-hidden + 의 죽은 title 속성** — 마우스 툴팁용으로 유지, 무해.
8. **day-detail 배럴이 순수 lib + 클라이언트 컴포넌트 동시 export** — 향후 서버 소비자 대비 `@/widgets/day-detail/lib` 서브패스 분리 검토(현재 둘 다 클라이언트 소비라 무해).
