# 컴포넌트 테스트 HARD군 — 리뷰 후속 (2026-06-04)

> 백로그 **A. 컴포넌트 테스트 HARD군** 구현 + 적대적 리뷰 반영 기록. 다음 세션 인계: `next-session-handoff.md`.

## 무엇

P1 백로그 A(마이그레이션 0 · 품질). 상태/부수효과가 가장 많은 폼/상세 컴포넌트 3종에 테스트 신규:

| 파일 | 테스트 | 핵심 검증 |
|------|-------|-----------|
| `features/technique-library/ui/TechniqueDetailView.test.tsx` | 16 | 4상태(AUTH OFF 미리보기·로딩·미발견·실데이터) · belt↔level 상호배타 · 태그/미디어/주의점/역참조 |
| `widgets/session-editor/ui/SessionEditorForm.test.tsx` | 7 | canSave(종목 0→비활성) · 접이식 · 저장 분기(ok/dormant/error) · invalidate |
| `widgets/technique-editor/ui/TechniqueForm.test.tsx` | 13 | 조건부 필드(belt/level/striking) · **종목변경 분류 리셋** · create/edit · prefill |

게이트: **vitest 1072**(기존 1036 + 신규 36) · tsc · lint · build(AUTH-OFF ○ Static) green.

## 패턴 (TagManager 관용구 확장)

`features/manage-tags/ui/TagManager.test.tsx`가 레퍼런스. hoisted 모노레포의 "Invalid hook call"을 vi.mock으로 우회:

- **`@tanstack/react-query` 통째 mock** — `useQuery`는 `queryKey`로 분기해 data 주입(`queryFn`은 호출 안 됨), `useQueryClient`는 `{ invalidateQueries }` 스텁. 컴포넌트 분기 로직·`canSave`·`usesBelt` 게이트·zod는 **실제 실행**된다(거짓 커버리지 아님).
- **`next/link` vi.mock `<a>` 스텁 — 필수 (이번에 확인된 신규 함정).** `next/link`가 next 번들의 **중첩 react**(`next/node_modules/react`) `useContext`를 끌어와 `TypeError: Cannot read properties of null (reading 'useContext')`로 깨진다. Link를 렌더하는 모든 컴포넌트 테스트에 적용.
- `isAuthEnabled`·`sonner`·server action mock. 무거운 자식(MediaPicker/TagInput/TechniquePicker/FavoriteStar/미디어 3종)은 stub — 서명URL useQuery·서버액션 체인을 끊는다. DisciplinePicker/discipline·category select·chip/badge는 실제 렌더.
- **server action의 schema는 `vi.importActual`로 모델 파일만 직접 로드** — index/action 경로는 `server-only`를 끌어와 클라 테스트에서 깨진다(예: `@/features/log-session/model/log-session-schema`만 실제, `logSession`은 mock).

## 적대적 리뷰 (code-reviewer opus) — 4건 반영

초안 작성 후 독립 적대 리뷰. "가짜 통과/거짓 커버리지" 관점.

- **[HIGH] 종목변경 category 리셋 분기 미검증** — 기존 종목변경 테스트가 분류를 먼저 고르지 않아 `setCategory('')`(TechniqueForm `handleDisciplineChange`)가 한 줄도 실행 안 됨 → 로직을 뒤집어도 green인 사각지대. **리셋(striking·punch→bjj_gi) + 유지(공통 entry) 2 테스트 추가**(유지 케이스가 "항상 리셋" 회귀까지 잡음).
- **[MED] belt↔level 음성 단언 trivially-true** — belt/level 중 하나가 `null`이라 "없음"이 당연했음(usesBelt 게이트 무관). **belt·level 둘 다 채운 데이터로 게이트 실작동 2 테스트 추가** + regex `/블루|흰띠|블랙/`(존재 불가 표적) → `/벨트/` 교정.
- **[MED] dormant/error의 invalidate 음성 단언 누락** — 성공 경로만 무효화하는데 dormant/error가 헛무효화해도 안 잡힘 → `expect(invalidateQueries).not.toHaveBeenCalled()` 추가.
- **[LOW] zod seam 미검증** — 성공 경로가 `trained_on/disciplines`만 봄 → RPC 계약(`techniques: []`, `media: []` 빈 배열 유지) objectContaining 보강.

리뷰 총평: "가짜 통과가 아니라 진짜 검증이 압도적(mock 경계 정확, beforeEach 리셋 완비, 분기 실제 실행)" — HIGH 1건만 실 사각지대였고 해소됨.

## 남은 사항

- 자식(MediaPicker/TagInput/TechniquePicker) **통합 흐름**은 각 자식 테스트의 책임 — 폼 본체 테스트는 stub로 격리(범위 결정).
- 로딩 분기는 `LoadingBody`가 `aria-hidden` Skeleton이라 **간접 검증**(미리보기/미발견/실데이터 분기 배제로 로딩 확정).
- edit prefill은 이름 채움으로 대표 검증 — 미디어/태그 prefill 타이밍(`existing*` ref 1회)은 컴포넌트 내부 가드라 별도 미검증.
