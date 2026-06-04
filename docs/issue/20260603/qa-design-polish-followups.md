# ④ 라이브 QA / 디자인 폴리시 (2026-06-04)

> 🟢 백로그 4번째. dev 서버 + chrome-devtools 로 라이브 화면 종합 점검. ①(터치타깃)·②(외부링크)·
> shadcn spacing 0.25rem 정정 이후의 시각 회귀를 실제 화면에서 검증.

## 점검 범위

- **/login** (AUTH ON) · **/calendar**·**/techniques** (AUTH OFF 셸로 재기동해 가드 통과). 전 화면 **콘솔 에러/경고 0**.
- 초점: spacing 0.25rem(이전 1px) 정정 후 레이아웃, 터치타깃 hit-area pseudo의 시각 불변, 라벨/계층.

## 결과 (양호)

- **spacing 0.25rem**: 로그인 카드(패딩·입력 간격), 캘린더 월 그리드(셀·요일 헤더), 기술 필터바(select 간격) 모두 의도대로 — 8px 그리드, 빽빽함 없음. **시각 회귀 0**(1px이 버그였음을 라이브로 재확인).
- **터치타깃 hit-area**: 시각 크기 불변 확인(뷰탭·IconButton·필터 select·FAB 외형 동일). pseudo 방식이 레이아웃을 건드리지 않음.
- **콘솔**: 런타임 에러/경고 0 (전 점검 화면).

## 발견 & 수정 (1건)

- **[MED] 캘린더 "즐겨찾기" 라벨 중복** — B(4번째 viewMode '즐겨찾기' 탭)와 기존 favoritesOnly 토글(시각 텍스트 '즐겨찾기')이 **같은 줄에 공존**해 텍스트가 겹침 → 사용자 혼란(어느 게 뷰 전환이고 어느 게 필터인지). 토글 시각 텍스트를 aria-label("즐겨찾기만 보기")과 일치하는 **'즐겨찾기만'**으로 변경(calendar-screen + TechniqueFilterBar 일관 — 두 화면 토글 통일). 탭=전 기간 뷰 / 토글=현 기간 필터로 구분 명확. 재스크린샷으로 확인. (테스트는 aria-label 셀렉터라 무영향.)

## 한계 / 남음

- **AUTH ON 실데이터 화면 미점검**: 헤드리스 미인증이라 캘린더 실세션·기술 카드/별표·통계 차트는 빈 셸(레이아웃/간격/터치타깃)만 검증. 실데이터 시각(카드 밀도·별표 오버레이·차트)은 사장님 로그인 후 육안 확인 권장(또는 setup-browser-cookies 로 쿠키 import).
- 즐겨찾기 viewMode 실제 동작(탭→AgendaView+네비 숨김)은 `calendar-screen.test`(③)로 커버됨.
- 터치타깃 hit-area의 실제 탭 정확도(겹침 영역)는 실기기 터치 검증이 이상적(데스크톱 헤드리스 한계).

## 게이트

tsc · lint · vitest 1083 · build(AUTH-OFF ○ Static) green. (라벨 변경은 시각 텍스트만 — test=aria-label 셀렉터라 무영향.)
