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

## ✅ 처리 완료 — LOW (2026-06-03 후속 #2)
1. **아젠다 날짜별 추가 버튼** → 각 날짜 그룹 헤더에 AddSessionButton 추가(주 뷰 패리티, 키보드/SR 추가 경로). 테스트에 스토어 mock + 버튼 수 단언. `CalendarAgendaView.tsx`.
2. **select 문자열 중복** → `SESSION_EMBED_SELECT` const로 단일화(fetchDaySessions/fetchRangeSessions 공유, 추론 보존 — tsc 확인). `calendar-queries.ts`.
4. **주 쿼리 키** → `['calendar','week', weekStartISO, weekEndISO]`로 endISO 포함(자기설명).
5. **활성 탭 그림자** → `shadow-e1`→`shadow-[var(--shadow-card)]`(다크 대응).
6. **주 today 빨강 이중** → 날짜 숫자 기본색, '오늘' 칩만 빨강 신호로 단일화. `CalendarWeekView.tsx`.
8. **배럴 lib+컴포넌트 혼재** → index.ts에 "서버는 ./lib 직접 import" 주석. `day-detail/index.ts`.

검증: 905 테스트·tsc·lint·build green.

### 의도적 미반영(결함 아님)
3. **range 쿼리 1000행 캡** — 월/주 범위는 현실적으로 <1000이라 무해(전체기간 집계인 F10과 달리 범위 한정). 필요 시 `.limit(1000)` 명시.
7. **aria-hidden + 의 title** — 마우스 툴팁용 유지, 무해.
