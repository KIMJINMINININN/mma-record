# Design.md — MMA 트레이닝 저널 · 디자인 시스템 & UX 명세

> 가칭 **RollLog** · Design 문서 버전 **v0.1 (Draft)** · 작성일 **2026-05-30**
> 상위 진실 공급원(SSoT) = `docs/mma/PRD.md`. 본 문서의 모든 용어·기능 ID(F1~F11)·종목 코드(`bjj_gi`/`bjj_nogi`/`wrestling`/`striking`/`mma`)·벨트 값(`white`/`blue`/`purple`/`brown`/`black` + stripes 0~4)·기술 분류·엔티티명은 PRD §4를 그대로 인용한다. 충돌하는 명칭을 새로 만들지 않는다.
> 본 문서는 **기획/디자인 명세**이며 소스 코드를 변경하지 않는다. 토큰 스니펫은 구현 가이드(Develop.md/구현 단계)에서 적용한다.

---

## 0. 미학 방향 (Aesthetic Direction)

**선택: "DOJO TACTICAL" — 도장(道場)의 절제 × 옥타곤의 긴장감.**

- **Tone**: 격투기 체육관의 본질 — 흰 도복(gi), 검은 매트, 빨간 코너/혈흔/심박. 화려함이 아니라 **절제된 긴장감**. 에디토리얼(editorial)에 가까운 넉넉한 여백 위에, 결정적인 순간에만 빨강을 칼처럼 쓴다.
- **핵심 차별점 (The ONE thing)**: **흰·검·빨 3색의 극단적 절제.** 빨강은 "장식"이 아니라 **신호(signal)** 다 — primary 액션, 오늘(today), 주의점(caution), 활성 상태에만 등장한다. 회색조 90% + 빨강 10%의 비율이 곧 브랜드다. 노션처럼 차분하되, 매트 위처럼 날카롭다.
- **무엇을 피하는가**: 보라 그라데이션(AI slop), 무지개 색상 분산, 둥글둥글한 파스텔. 종목/벨트 도메인 색은 "정보"로만 쓰고 브랜드 빨강과 충돌시키지 않는다.

---

## 1. 디자인 원칙 (Design Principles)

| # | 원칙 | 의미 | PRD 근거 |
|---|------|------|---------|
| **P1** | **마찰 없는 기록 (Frictionless Logging)** | 수업 직후 90초 안에 저장. 기본값·자동완성·최소 필수 필드(종목+날짜)로 입력 비용을 0에 수렴시킨다. 모바일 한 손 조작 우선. | G1 / J1 / F3-AC6 / Metrics ≤90초 |
| **P2** | **복습 가독성 (Readable for Recall)** | "어제 그 디테일이 뭐였지?"를 3초 안에. 정보 위계가 명확하고, 주의점은 시각적으로 튀고, 영상은 한눈에 잡힌다. 밀도보다 스캔성. | G2 / 페르소나 / F6 |
| **P3** | **격투기 도메인 시각화 (Domain as First-Class)** | 종목·벨트·포지션·분류가 데이터뿐 아니라 UI의 1급 시민. 배지 한 번으로 맥락이 전달된다. | G3 / F9 |
| **P4** | **흰·검·빨 절제미 (Disciplined Tri-color)** | 회색조가 무대, 빨강은 신호. 빨강 남용 금지 — primary/오늘/주의/활성에만. 도메인 색은 정보 레이어로 분리. | 사용자 요구 / 부록A |
| **P5** | **영상 친화 (Media-Native)** | 내 영상과 유튜브가 기록의 1급 콘텐츠. 카드·플레이어·썸네일·업로드 진행이 매끄럽다. | G4 / F5 |
| **P6** | **웹·모바일 패리티 (One UI, Two Surfaces)** | 동일 웹 UI가 데스크톱과 Expo WebView에서 모두 자연스럽게. 반응형 + 터치 타깃 + safe-area. | G5 / 부록A |

---

## 2. 컬러 시스템 (Color System)

### 2.1 철학 — 3-Tier 색 모델

색을 **3개의 분리된 레이어**로 운용한다. 섞지 않는다.

1. **Brand / Neutral (무대)** — 흰·검·회색조 + **Red(브랜드 primary)**. UI 골격, primary 액션, 상태.
2. **Domain — Belt (정보)** — 주짓수 벨트 5색. F9 벨트 배지 전용. 브랜드 빨강과 의미 충돌 없음(벨트엔 빨강 없음).
3. **Domain — Discipline (정보)** — 종목 5색 + 아이콘. 브랜드 빨강을 피한 색상환에서 선택.

> ⚠️ **빨강 충돌 회피 규칙**: 브랜드 빨강(`--color-red-500`)은 신호 전용. 종목 색은 빨강 계열을 쓰지 않는다(아래 2.5에서 orange/amber/teal/violet/slate 사용). 벨트엔 애초에 빨강이 없다. 따라서 화면에서 "빨강 = 항상 액션/주의/오늘"이라는 단일 의미가 유지된다.

### 2.2 Red Scale (브랜드 Primary) — 확정 HEX

기존 `tailwind-theme.css`의 red 스케일은 채도가 높고 분홍빛(`#f15b5b`)으로 "blood/tactical" 톤에 약하다. **재정의**한다. primary는 **`--color-red-500 = #E11D2A`** (자신감 있는 진홍, 옥타곤 레드).

| Token | HEX | 용도 |
|-------|-----|------|
| `--color-red-50`  | `#FFF1F2` | 가장 옅은 배경(주의 박스 light 바탕), hover 틴트 |
| `--color-red-100` | `#FFE0E2` | 옅은 배경, 칩 selected 바탕(light) |
| `--color-red-200` | `#FCC0C4` | border 강조(light) |
| `--color-red-300` | `#F88A91` | disabled-on-red, 보조 |
| `--color-red-400` | `#F25761` | hover(밝은 표면 위 텍스트 보조) |
| `--color-red-500` | `#E11D2A` | **PRIMARY** — 버튼/오늘/활성/링크 강조 |
| `--color-red-600` | `#C2151F` | primary hover / pressed |
| `--color-red-700` | `#9E0F18` | primary active / 진한 강조 |
| `--color-red-800` | `#7A0C13` | 텍스트-on-light 강조(고대비) |
| `--color-red-900` | `#5C080E` | 가장 진한, dark 표면 위 deep accent |

근거: `#E11D2A`는 흰 배경(#FFFFFF) 대비 **약 4.8:1** (큰 텍스트/그래픽 AA 충족), 검정 텍스트와도 분리. dark 표면(#101012)에서도 채도가 살아남는다.

### 2.3 Neutral Scale (Black → White)

기존 gray는 약간 푸른끼(`#353a3f`)가 있다. **중립(슬레이트-그레이) → 진짜 검정** 으로 재정의해 흰·검 대비를 선명하게.

| Token | HEX | 용도 |
|-------|-----|------|
| `--color-white` | `#FFFFFF` | 최상위 표면(light) / 텍스트(dark) |
| `--color-gray-025` | `#FAFAFA` | app 배경(light) |
| `--color-gray-50`  | `#F4F4F5` | 보조 표면, 카드 hover(light) |
| `--color-gray-100` | `#E9E9EC` | divider/track |
| `--color-gray-200` | `#D7D7DC` | border 기본(light) |
| `--color-gray-300` | `#BCBCC4` | disabled border, 약한 아이콘 |
| `--color-gray-400` | `#9A9AA3` | placeholder, 캡션 보조 |
| `--color-gray-500` | `#71717A` | secondary 텍스트 |
| `--color-gray-600` | `#52525B` | body 보조 텍스트 |
| `--color-gray-700` | `#3F3F46` | 강한 본문(dark 카드 표면) |
| `--color-gray-800` | `#27272A` | 표면(dark) / 진한 텍스트(light) |
| `--color-gray-900` | `#18181B` | 카드 표면(dark) / 최강 텍스트(light) |
| `--color-gray-950` | `#101012` | app 배경(dark) |
| `--color-black` | `#000000` | 순수 검정(로고/하이컨트라스트 보더) |
| `--color-black-30` | `#0000004d` | 오버레이/스크림(딤) |

### 2.4 Semantic Tokens — Light & Dark

토큰은 **의미 기반 별칭(alias)** 이다. 컴포넌트는 raw 색이 아니라 의미 토큰을 참조한다.

| Semantic | Light 값 | Dark 값 | 용도 |
|----------|---------|---------|------|
| `--surface-app` | `gray-025 #FAFAFA` | `gray-950 #101012` | 최하단 앱 배경 |
| `--surface-base` | `white #FFFFFF` | `gray-900 #18181B` | 카드/시트/패널 기본 표면 |
| `--surface-raised` | `white #FFFFFF` | `gray-800 #27272A` | 팝오버/모달/dropdown(한 단계 위) |
| `--surface-sunken` | `gray-50 #F4F4F5` | `gray-950 #0C0C0E` | 입력 트랙/코드/딤 영역 |
| `--text-strong` | `gray-900 #18181B` | `white #FFFFFF` | 제목/강조 본문 |
| `--text-default` | `gray-800 #27272A` | `gray-100 #E9E9EC` | 기본 본문 |
| `--text-muted` | `gray-500 #71717A` | `gray-400 #9A9AA3` | 보조/캡션 |
| `--text-disabled` | `gray-400 #9A9AA3` | `gray-600 #52525B` | 비활성 |
| `--text-on-primary` | `white #FFFFFF` | `white #FFFFFF` | 빨강 버튼 위 텍스트 |
| `--border-default` | `gray-200 #D7D7DC` | `gray-700 #3F3F46` | 기본 보더/divider |
| `--border-strong` | `gray-300 #BCBCC4` | `gray-600 #52525B` | 강한 보더(입력 focus 전) |
| `--border-subtle` | `gray-100 #E9E9EC` | `gray-800 #27272A` | 약한 구분선 |
| `--primary` | `red-500 #E11D2A` | `red-500 #E11D2A` | primary 액션/오늘/활성 |
| `--primary-hover` | `red-600 #C2151F` | `red-400 #F25761` | hover |
| `--primary-active` | `red-700 #9E0F18` | `red-300 #F88A91` | pressed |
| `--primary-soft` | `red-50 #FFF1F2` | `red-900 #5C080E` | 빨강 틴트 배경(선택/강조 바탕) |
| `--danger` | `red-600 #C2151F` | `red-400 #F25761` | 파괴적 액션/에러 |
| `--success` | `#15803D` | `#34D399` | 성공/저장됨 |
| `--warning` | `#B45309` | `#FBBF24` | 경고/주의(텍스트) |
| `--focus-ring` | `red-500 #E11D2A` @ 40% | `red-400 #F25761` @ 55% | 키보드 포커스 링 |

> **빨강 = danger vs 빨강 = primary 모호성 해소**: 둘 다 빨강이지만 **형태로 구분**한다 — primary는 **채워진(solid) 버튼**, danger는 **테두리/텍스트 또는 확인 다이얼로그 안의 solid**. 일상 화면에서 빨강 solid 버튼은 "주요 다음 행동(저장/추가)"이고, 삭제는 항상 한 단계(메뉴→확인 다이얼로그) 뒤에 둔다. 색약 사용자를 위해 파괴적 액션엔 항상 아이콘(휴지통) + 텍스트("삭제") 병기.

### 2.5 Domain Colors A — 벨트 (Belt) · 주짓수 전용 (F9-AC1)

PRD §4.3: `white`/`blue`/`purple`/`brown`/`black` (+ stripes 0~4). **권위 표준이 아니라 사용자 주관 가이드**(R4) — UI는 사실 그대로 "벨트 색"을 보여주되, 빨강 신호와 절대 겹치지 않게(벨트엔 빨강 없음).

| Belt | 바(bar) HEX | Stripe 색 | Light 표면 위 렌더링 | Dark 표면 위 렌더링 |
|------|-----------|----------|----------------------|----------------------|
| `white` | `#FFFFFF` | `#18181B`(검정 stripe) | **ring/border 필수**: `1px inset gray-300 #BCBCC4` + 미세 그림자. 바 안쪽은 순백 | 바 `#FFFFFF`, border `gray-600`, stripe 검정 |
| `blue` | `#1D4ED8` | `#FFFFFF`(흰 stripe) | 그대로 | 그대로(채도 충분) |
| `purple` | `#6D28D9` | `#FFFFFF` | 그대로 | `#7C3AED`로 한 톤 밝게 |
| `brown` | `#6B4226` | `#FFFFFF` | 그대로 | `#7C4F30`로 한 톤 밝게 |
| `black` | `#18181B` | `#E11D2A`(**빨강 stripe** — 흑벨트 적색 바) | 바 검정, border 불필요 | border `gray-700`로 검정 표면과 분리 |

> **white belt 핵심 처리**: 흰 표면 위 흰 벨트가 사라지는 문제 → **항상 inset ring(`gray-300`) + 외곽 1px 그림자**로 윤곽을 만든다. 텍스트 라벨("흰띠")도 항상 병기(색약/대비 보강).
> **black belt의 빨강 stripe**: 실제 흑벨트의 적색 바를 반영하므로 이 빨강은 "도메인 사실"로 허용 — 단 배지 내부에 국한되고 액션 의미가 아님이 맥락으로 명확.

### 2.6 Domain Colors B — 종목 (Discipline) · 5종 + 아이콘 (F9-AC2)

PRD §4.1의 5개 코드에 1:1 매핑. **브랜드 빨강을 피한 색상환**에서 선택(orange/teal/violet/slate/amber). 색약 대응(P3/F9-AC4)을 위해 **색 + 고유 아이콘 + 한글 라벨 3중 인코딩**을 항상 함께 쓴다.

| 코드 | 한글 라벨(PRD) | 색 (light) | 색 (dark, 한 톤 ↑) | 아이콘(개념) | 점(dot) 색 |
|------|----------------|-----------|---------------------|--------------|-----------|
| `bjj_gi` | 주짓수 (기) | `#1D4ED8` (blue-700) | `#3B82F6` | 도복 깃(lapel/gi-collar) | 파랑 |
| `bjj_nogi` | 노기 주짓수 | `#0E7490` (teal-700) | `#22B8CF` | 래시가드(물결/wave) | 청록 |
| `wrestling` | 레슬링 | `#B45309` (amber-700) | `#F59E0B` | 싱글렛/맞잡은 손(grip) | 앰버 |
| `striking` | 타격 | `#C2410C` (orange-700) | `#FB7355` | 글러브(boxing glove) | 오렌지 |
| `mma` | MMA | `#5B21B6` (violet-800) | `#8B5CF6` | 케이지(octagon/fence) | 바이올렛 |

근거 / 충돌 회피:
- `striking`의 오렌지(`#C2410C`)와 브랜드 빨강(`#E11D2A`)은 **인접하지만 명도/채도 분리**가 명확하고, 종목 색은 항상 **점/칩(작은 정보 단위)** 으로만 등장하며 액션 빨강은 **버튼/오늘 셀(큰 면적)** 로 등장 → 면적·형태로 구분된다. 의심스러운 인접 사용(예: striking 칩 옆 primary 버튼)은 칩에 아이콘이 항상 붙어 추가 식별.
- `bjj_gi` 파랑과 belt `blue`(#1D4ED8)는 같은 계열이나 **다른 컨텍스트**(종목 vs 벨트)에서 등장하고, 종목은 아이콘이 동반되어 혼동 없음. (의도적 일관성: "주짓수=파랑 계열"이 자연스러움.)
- 5색 모두 light/dark 양쪽에서 흰 텍스트(라벨이 색 위에 올라갈 때) 대비 ≥ 4.5:1 또는 라벨을 색 옆 중립 텍스트로 둔다(기본은 후자 = 칩 배경은 옅은 틴트, 텍스트는 `text-default`).

### 2.7 기존 `tailwind-theme.css` @theme 블록에 매핑하는 구체 스니펫

> 기존 파일은 `--color-*: initial`로 리셋 후 토큰을 선언하는 Tailwind v4 `@theme` 패턴이다. 아래는 **재테마(red/black/white)로 교체·확장**하는 형태. (구현 단계에서 기존 blue `--color-primary-*`는 제거하거나 red alias로 대체.)

```css
/* apps/web/src/shared/styles/tailwind-theme.css (재테마 발췌) */

@theme {
  --color-*: initial;
  --font-*: initial;
  --text-*: initial;
  --font-weight-*: initial;
  --radius-*: initial;

  /* Font (유지) */
  --font-pretendard: "Pretendard", sans-serif;

  /* ---- Neutral: Black → White (재정의) ---- */
  --color-white: #ffffff;
  --color-gray-025: #fafafa;
  --color-gray-50:  #f4f4f5;
  --color-gray-100: #e9e9ec;
  --color-gray-200: #d7d7dc;
  --color-gray-300: #bcbcc4;
  --color-gray-400: #9a9aa3;
  --color-gray-500: #71717a;
  --color-gray-600: #52525b;
  --color-gray-700: #3f3f46;
  --color-gray-800: #27272a;
  --color-gray-900: #18181b;
  --color-gray-950: #101012;
  --color-black: #000000;
  --color-black-30: #0000004d;

  /* ---- Red = Brand Primary (재정의) ---- */
  --color-red-50:  #fff1f2;
  --color-red-100: #ffe0e2;
  --color-red-200: #fcc0c4;
  --color-red-300: #f88a91;
  --color-red-400: #f25761;
  --color-red-500: #e11d2a;  /* PRIMARY */
  --color-red-600: #c2151f;
  --color-red-700: #9e0f18;
  --color-red-800: #7a0c13;
  --color-red-900: #5c080e;

  /* ---- Status (semantic raw) ---- */
  --color-success-600: #15803d;
  --color-success-400: #34d399;
  --color-warning-600: #b45309;
  --color-warning-400: #fbbf24;

  /* ---- Domain: Belt ---- */
  --color-belt-white: #ffffff;
  --color-belt-blue:  #1d4ed8;
  --color-belt-purple:#6d28d9;
  --color-belt-brown: #6b4226;
  --color-belt-black: #18181b;
  --color-belt-stripe:#ffffff;        /* 기본 stripe (검정/유색 벨트) */
  --color-belt-stripe-onwhite: #18181b; /* 흰띠 stripe */
  --color-belt-stripe-onblack:  #e11d2a; /* 흑띠 적색 바 */

  /* ---- Domain: Discipline (light 기준) ---- */
  --color-disc-bjj-gi:    #1d4ed8;
  --color-disc-bjj-nogi:  #0e7490;
  --color-disc-wrestling: #b45309;
  --color-disc-striking:  #c2410c;
  --color-disc-mma:       #5b21b6;

  /* Radius (유지) */
  --radius-xxs: 6px;
  --radius-xs:  8px;
  --radius-s:   10px;
  --radius-m:   12px;
  --radius-l:   16px;
  --radius-xl:  20px;
  --radius-xxl: 24px;

  /* Spacing 기준 (유지) */
  --spacing: 1px;

  /* Elevation / Motion (신규, §4) */
  --shadow-e1: 0 1px 2px 0 rgb(0 0 0 / 0.06);
  --shadow-e2: 0 2px 8px -1px rgb(0 0 0 / 0.10);
  --shadow-e3: 0 8px 24px -4px rgb(0 0 0 / 0.14);
  --shadow-e4: 0 16px 48px -8px rgb(0 0 0 / 0.20);
  --ring-focus: 0 0 0 3px rgb(225 29 42 / 0.40);

  --duration-instant: 80ms;
  --duration-fast:    140ms;
  --duration-base:    200ms;
  --duration-slow:    300ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasized: cubic-bezier(0.2, 0, 0, 1.2);
}
```

**Semantic alias 레이어 (light/dark 스위치)** — `@theme`는 정적이므로, 의미 토큰은 `:root` / `[data-theme]`에 둔다(런타임 토글 가능):

```css
/* 같은 파일 하단 또는 index.css */
:root,
:root[data-theme="light"] {
  --surface-app:    var(--color-gray-025);
  --surface-base:   var(--color-white);
  --surface-raised: var(--color-white);
  --surface-sunken: var(--color-gray-50);
  --text-strong:    var(--color-gray-900);
  --text-default:   var(--color-gray-800);
  --text-muted:     var(--color-gray-500);
  --text-disabled:  var(--color-gray-400);
  --text-on-primary:var(--color-white);
  --border-default: var(--color-gray-200);
  --border-strong:  var(--color-gray-300);
  --border-subtle:  var(--color-gray-100);
  --primary:        var(--color-red-500);
  --primary-hover:  var(--color-red-600);
  --primary-active: var(--color-red-700);
  --primary-soft:   var(--color-red-50);
  --danger:         var(--color-red-600);
  --success:        var(--color-success-600);
  --warning:        var(--color-warning-600);
  --shadow-card:    var(--shadow-e2);
  color-scheme: light;
}

:root[data-theme="dark"] {
  --surface-app:    var(--color-gray-950);
  --surface-base:   var(--color-gray-900);
  --surface-raised: var(--color-gray-800);
  --surface-sunken: #0c0c0e;
  --text-strong:    var(--color-white);
  --text-default:   var(--color-gray-100);
  --text-muted:     var(--color-gray-400);
  --text-disabled:  var(--color-gray-600);
  --text-on-primary:var(--color-white);
  --border-default: var(--color-gray-700);
  --border-strong:  var(--color-gray-600);
  --border-subtle:  var(--color-gray-800);
  --primary:        var(--color-red-500);
  --primary-hover:  var(--color-red-400);
  --primary-active: var(--color-red-300);
  --primary-soft:   var(--color-red-900);
  --danger:         var(--color-red-400);
  --success:        var(--color-success-400);
  --warning:        var(--color-warning-400);
  /* dark에서는 그림자 약화 + 보더로 입체 표현 */
  --shadow-card:    0 1px 0 0 rgb(255 255 255 / 0.04), 0 2px 12px -2px rgb(0 0 0 / 0.6);
  color-scheme: dark;
}

/* OS 선호 자동 적용 (사용자 토글 없을 때) */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    /* dark 블록과 동일 값 복제 (또는 :where()로 공유) */
    color-scheme: dark;
  }
}
```

### 2.8 다크 모드 결정 (권고)

**권고: 다크 모드를 MVP에 포함한다 (P0 토글 + OS 자동).** 근거:
- 흰·검·빨 팔레트는 **dark에서 가장 강력**하다 — 검은 매트 배경 위 빨강 신호 = 옥타곤 미학의 정수. 브랜드 차별점을 극대화.
- 매트/체육관은 조명이 어둡고, 사용자는 밤 훈련 후 폰으로 기록(J1) → 눈부심 감소.
- 영상(어두운 썸네일) 표시가 dark 표면에서 더 자연스럽다.

**스위칭 메커니즘**:
- 1순위 **`[data-theme="light"|"dark"]`** 를 `<html>`에 부여(사용자 명시 선택, localStorage 영속).
- 미선택 시 **`prefers-color-scheme`** 자동 적용.
- WebView(Expo) 셸은 native 테마를 `data-theme`로 주입 가능(웹·모바일 패리티). 토글은 프로필 화면(F1)에 둔다.
- 깜빡임(FOUC) 방지: SSR/초기 인라인 스크립트로 `<html data-theme>`를 paint 전 설정.

---

## 3. 타이포그래피 (Typography)

**Pretendard 유지** (이미 `index.css`에서 import, KR 1순위). 기존 `@utility text-*` 스케일을 **그대로 재사용**한다(새 폰트 도입 없음 — 한글 가독성·번들 일관성·기 설치). 표시 폰트를 따로 두지 않고, **굵기(700)와 크기 대비**로 위계를 만든다(절제미 원칙 P4와 일치).

> 본 프로젝트는 RN WebView로도 서빙되므로 새 웹폰트 추가는 패리티·로딩 비용을 키운다. Pretendard 단일 패밀리 + variable subset 유지가 정답.

### 3.1 의미 → 기존 유틸 매핑

| 의미 역할 | 기존 유틸 | 크기/굵기 | 사용처 |
|-----------|-----------|-----------|--------|
| 화면 대표 타이틀(거의 안 씀) | `text-display-m` | 40/700 | 온보딩/빈 상태 히어로 |
| 페이지 타이틀 | `text-heading-xl` | 28/700 | 캘린더 월 제목, 기술 라이브러리 제목 |
| 섹션 타이틀 | `text-heading-l` | 24/700 | Day Detail 날짜, 기술 상세 이름 |
| 카드 타이틀 | `text-heading-s` | 18/700 | 세션 카드 종목 요약, 기술 카드 이름 |
| 소제목/리스트 헤더 | `text-heading-xs` | 16/700 | 검색 결과 그룹 헤더, 폼 섹션 |
| 본문 기본 | `text-body-m-400` | 17/400 | 설명, 메모 본문 |
| 본문 강조 | `text-body-m-500` | 17/500 | 강조 문장, 필드 값 |
| 보조 본문/리스트 | `text-body-s-400` | 15/400 | 세션 메타(체육관·시간), 보조 설명 |
| 캡션 | `text-body-xs-400` | 13/400 | 날짜·타임스탬프·도움말 |
| 마이크로 캡션 | `text-body-xxs-500` | 11/500 | 캘린더 셀 카운트, 미세 라벨 |
| 버튼(기본) | `text-button-m` | 15/500 | 일반 버튼 |
| 버튼(대형/모바일 CTA) | `text-button-l` | 17/500 | 저장/추가 주요 버튼 |
| 배지 라벨 | `text-button-xs` / `text-button-xxs` | 12·10/500 | 종목 칩·벨트 라벨·태그 칩 |

규칙: 한 화면에 위계 3단계 이내. 숫자(시간/강도/카운트)는 `tabular-nums` 권장(정렬감).

---

## 4. 스페이싱 · 라운드 · 엘리베이션 · 모션

### 4.1 Spacing
기존 `--spacing: 1px` 기준 Tailwind 스케일 유지. **8px 그리드**를 운영 기준으로(4의 배수 보조). 권장 스텝: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`. 컴포넌트 내부 패딩은 12~16, 섹션 간격 24~32, 카드 간 gap 12~16.

### 4.2 Radius (기존 재사용)
| 토큰 | 값 | 용도 |
|------|----|------|
| `--radius-xxs` 6 | 칩/배지/태그, 작은 인풋 |
| `--radius-xs` 8 | 버튼, 인풋 |
| `--radius-s` 10 | 작은 카드, dropdown |
| `--radius-m` 12 | **기본 카드(세션/기술)**, 미디어 카드 |
| `--radius-l` 16 | 모달/다이얼로그, 큰 패널 |
| `--radius-xl` 20 | 바텀시트 상단 모서리 |
| `--radius-xxl` 24 | 히어로/대형 컨테이너(희소) |

날카로움 유지를 위해 8~12를 주력으로(과한 라운드 = 파스텔감, 회피).

### 4.3 Elevation / Shadow (red/black 시스템용)
중립 그림자(검정 기반). dark에서는 그림자 대신 **상단 1px 하이라이트 + 깊은 soft 그림자**로 표현(§2.7 `--shadow-card`).

| 레벨 | 토큰 | 용도 |
|------|------|------|
| E0 | none + `border-subtle` | flat 리스트 항목 |
| E1 | `--shadow-e1` | 카드 기본(light), hover 전 |
| E2 | `--shadow-e2` | 카드 hover, dropdown |
| E3 | `--shadow-e3` | 팝오버, FAB |
| E4 | `--shadow-e4` | 모달/바텀시트 오버레이 위 |

**Primary 강조 그림자(선택)**: 주요 CTA에 한해 `0 4px 14px -2px rgb(225 29 42 / 0.35)` (빨강 글로우)를 hover에 적용 — 절제하여 1화면 1개.

### 4.4 Motion
| 토큰 | 값 | 용도 |
|------|----|------|
| `--duration-instant` | 80ms | hover 색 변화, 포커스 링 |
| `--duration-fast` | 140ms | 버튼 press, 칩 토글 |
| `--duration-base` | 200ms | dropdown/팝오버, 탭 전환 |
| `--duration-slow` | 300ms | 바텀시트/모달 등장(기존 `b-bs-in` 0.3s와 일치) |
| ease | `--ease-standard` cubic-bezier(0.2,0,0,1) | 대부분 |
| ease(강조) | `--ease-emphasized` | FAB 등장, 저장 성공 등 |

원칙(P1/P2): 모션은 **상태 전환의 의미 전달**에만. 캘린더 월 전환은 슬라이드 200ms, 저장 성공은 빨강 체크 펄스 1회. `prefers-reduced-motion` 존중(아래 §10). 기존 `animate-bs-in/out`, `animate-skeleton` 재사용.

---

## 5. 컴포넌트 시스템 결정 (Component System Decision)

### 5.1 권고 — **기존 Tailwind v4 토큰 재테마 + 소형 headless 커스텀 세트**

> **결론: MUI를 도입하지 않는다.** 기존 Tailwind v4 `@theme` 토큰 시스템을 red/black/white로 **재테마**하고, 그 위에 **작은 headless 컴포넌트 세트**(Button / Input / Select / Dialog / Chip / Card / Sheet)를 직접 만든다.

**근거**:
| 기준 | Tailwind 토큰 + 커스텀 headless (권고) | MUI (대안) |
|------|----------------------------------------|-----------|
| **번들 크기** | Tailwind는 사용분만 추출(JIT). 컴포넌트는 필요한 것만. **수십 KB** | Emotion 런타임 + 컴포넌트 = **수백 KB**, RN WebView에 부담 |
| **현재 스택 적합** | 이미 Tailwind v4 + `@theme` + Pretendard + 커스텀 reset(preflight 미사용) 구축됨. **마이그레이션 0** | 전면 재구성. preflight/Emotion과 기존 SCSS 잔재 충돌 위험 |
| **RN WebView 성능** | CSS 변수 + 정적 클래스 = 빠른 paint, 적은 JS | Emotion 런타임 스타일 주입 = 초기 paint·메모리 비용 ↑(매트 현장 저사양 기기) |
| **디자인 통제** | 흰·검·빨 절제미를 토큰으로 100% 통제. MUI 기본 룩 탈피 비용 없음 | Material 디자인 기본값을 덮어쓰는 비용 큼(우리 미학과 상충) |
| **다크 모드** | `[data-theme]` + CSS 변수로 단순·일관 | MUI ThemeProvider 이중 관리 |
| **접근성** | headless 패턴(focus trap/ARIA)을 직접 구현하거나 초경량 헤드리스(예: 필요 시 `@headlessui` 류) 선택 도입 | 접근성 내장은 장점(유일한 MUI 우위) |

**MUI의 유일한 트레이드오프 인정**: 접근성·복잡 컴포넌트(autocomplete, date picker)가 기성품으로 강력. → 우리는 **검색 자동완성·태그 입력·셀렉트**만 신경 쓰면 되고, 캘린더는 이미 `react-calendar` 설치됨. 따라서 MUI 전체를 들일 만큼의 이득이 없다. 접근성은 **headless 동작 패턴을 컴포넌트별로 명시**(아래 인벤토리의 states/ARIA)하여 확보.

> "Material-UI-**like**"라는 사용자 OK는 **느낌(깔끔한 컴포넌트 시스템)** 으로 충족하되, **라이브러리 채택은 하지 않는다**. 토큰·컴포넌트 규약으로 MUI 같은 일관성을 직접 만든다.

### 5.2 의존성 / 도구 정리
- **Calendar**: `react-calendar`(설치됨) 위에 토큰 재테마 + 커스텀 day-cell 렌더(§7a, §8).
- **Headless 동작(선택 도입 후보)**: 다이얼로그 focus-trap / 콤보박스 키보드 내비가 필요하면 초경량 라이브러리 1개 또는 자체 훅. (full MUI/Radix-everything 지양.)
- **아이콘**: 단색 라인 아이콘 세트(종목 아이콘 포함) — `currentColor` 기반 SVG로 light/dark 자동 대응.

### 5.3 코어 컴포넌트 인벤토리 (states 포함)

| 컴포넌트 | variants | states | 비고 |
|----------|----------|--------|------|
| **Button** | `primary`(빨강 solid) / `secondary`(중립 outline) / `ghost`(투명) / `danger`(빨강 outline→확인 시 solid) | default · hover · active · focus-visible(빨강 ring) · disabled · loading(스피너) | size: sm/md/lg. 모바일 CTA는 lg + 풀폭 |
| **IconButton** | ghost / solid | 위와 동일 | 최소 터치 44×44 |
| **Input / Textarea** | default / error / success | default · focus(빨강 ring + `border-strong`) · filled · disabled · readonly | label·helper·error 텍스트 슬롯. number는 `tabular-nums` |
| **Select / Combobox** | single / multi(태그) | closed · open · focus · selected · disabled | 키보드 ↑↓/Enter/Esc, ARIA listbox |
| **DatePicker(경량)** | inline / popover | — | 세션 날짜 선택. react-calendar 재사용 가능 |
| **Dialog / Modal** | center / confirm(danger) | open · closing | focus-trap, Esc 닫기, scrim `black-30`, E4 |
| **Sheet (BottomSheet)** | mobile | open · closing | `animate-bs-in/out` 재사용, drag-to-dismiss, safe-area-bottom |
| **Card** | base / interactive(hover E2) / media | default · hover · pressed · selected(빨강 ring) | radius-m. 세션·기술·미디어 카드의 기반 |
| **Chip** | discipline / tag / filter | default · selected · removable(×) · disabled | radius-xxs, §6 상세 |
| **Badge** | belt / count / status | static | belt는 §6 BeltBadge |
| **Tabs** | underline(빨강 인디케이터) | active · inactive · focus | 캘린더 월/주/아젠다, 상세 탭 |
| **SearchBar** | global(상단 고정) | idle · focus · typing · results | F8, 디바운스, 결과 드롭다운/페이지 |
| **Toast / Inline alert** | success / danger / warning / info | enter · exit | 저장됨/실패 재시도 |
| **CautionBox** | caution | static | F6 주의점 빨강 강조 박스(§9) |
| **MediaCard** | upload / youtube / external | idle · uploading · ready · error | §9 |
| **Avatar / RankRow** | — | — | 프로필 종목별 랭크(F1) |
| **EmptyState** | — | — | 빈 날·빈 라이브러리 |
| **Skeleton** | text / card / media | loading | `animate-skeleton` 재사용 |
| **FAB (빠른추가 +)** | primary | default · hover(빨강 글로우) · pressed | 전역, safe-area, §7 |

---

## 6. 시그니처 컴포넌트 상세 스펙

### 6.1 BeltBadge (벨트 배지) — 주짓수 전용 (F9-AC1)

벨트 색 **바(bar)** + **스트라이프(0~4)**. 주짓수(`bjj_gi`/`bjj_nogi`) 기술/랭크에만 노출(레슬링·타격엔 미노출 — 대신 DisciplineChip만, PRD §4.3).

**구조**: 가로 막대(벨트 색) + 우측에 stripe 영역(흑/유색 벨트는 흰 stripe, 흰띠는 검정 stripe, 흑띠는 적색 stripe = §2.5). 라벨 텍스트("블루 · II") 병기(색약 대응).

**사이즈**: `xs`(캘린더/리스트 인라인, 높이 14), `sm`(카드, 18), `md`(상세 헤더, 24).

```
sm 사이즈 — 파란벨트 stripe 2 (도복 위 흰 stripe)
┌───────────────────────────────┐
│ ███████████████████  ▏│▏│     │   ← 바=blue #1D4ED8, stripe=흰색×2
└───────────────────────────────┘
  블루 · II                          ← 라벨(text-button-xs, text-muted)

흰띠 stripe 0  (흰 표면에서 사라지지 않게 inset ring)
┌───────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│   ← 바=흰색, 1px inset ring gray-300 + 미세 그림자
└───────────────────────────────┘
  흰띠                                ← 라벨 항상 병기

흑띠 stripe 4  (적색 바 = 실제 흑벨트)
┌───────────────────────────────┐
│██████████████████  ▎│▎│▎│▎│   │   ← 바=검정 #18181B, stripe=빨강 #E11D2A ×4
└───────────────────────────────┘
  블랙 · IV
```

규칙:
- stripe 0개면 stripe 영역 비움(바만).
- 흰띠: **반드시 ring + shadow**. 라벨 필수.
- 흑띠 적색 stripe는 도메인 사실이라 허용하되, 이 배지 밖 빨강 의미(액션)와 혼동되지 않음(배지 컨텍스트·라벨로 명확).
- dark 모드: purple/brown은 한 톤 ↑, white belt는 border `gray-600`.
- 접근성: `aria-label="블루 벨트, 스트라이프 2"`.

### 6.2 DisciplineChip (종목 칩) — 5종 (F9-AC2)

색 + 아이콘 + 한글 라벨 **3중 인코딩**. 기본형은 **옅은 틴트 배경 + 컬러 아이콘 + 중립 텍스트**(절제미). 강조형(필터 selected)은 색 채움.

**사이즈**: `dot`(캘린더 셀, 점만 6px), `xs`(리스트), `sm`(카드/헤더).

```
sm 기본 (틴트형) — 노기 주짓수
┌──────────────────────┐
│ 〰  노기 주짓수        │   ← 배경 teal-50 틴트, 아이콘 teal-700, 텍스트 text-default
└──────────────────────┘

xs 5종 나란히 (리스트/필터)
[🥋 주짓수(기)] [〰 노기] [🤼 레슬링] [🥊 타격] [⬡ MMA]
   blue          teal      amber       orange    violet

dot — 캘린더 셀용 (색+모양으로만, 라벨은 셀 합계가 대신)
● ◗ ◆ ◼ ⬡   ← 5종 점. 색약 위해 점도 미세하게 모양 차이 옵션(원/반원/마름모…)
```

규칙:
- 아이콘은 항상 동반(색만으로 식별 금지 — F9-AC4).
- selected(필터): 배경=종목색 채움, 텍스트/아이콘=흰색(대비 ≥4.5:1 확인).
- removable 아님(종목은 세션 속성). 토글 필터에서는 selected 상태만.
- dark: 틴트 배경은 종목색 12% 알파, 아이콘은 dark 톤(한 단계 ↑).

### 6.3 TagChip (태그 칩) — F7

자유 태그. **removable**(× 버튼)과 **selectable**(필터) 상태. 중립 베이스(빨강 신호와 분리), 선택 시에만 빨강 틴트.

**사이즈**: `xs` / `sm`. radius-xxs.

```
default (읽기)            selected (필터 ON)         removable (편집)
┌───────────┐            ┌───────────┐              ┌──────────────┐
│ #백테이크  │            │ #스윕      │              │ #보우앤애로우 ✕│
└───────────┘            └───────────┘              └──────────────┘
 bg gray-50               bg red-50,                  bg gray-50,
 text default             border red-500,             ✕ = text-muted→
 hover bg gray-100        text red-700                hover danger
```

states: default · hover · selected(빨강 틴트+border) · removable(× hover 시 danger) · disabled · focus-visible(빨강 ring). 다중 선택 = AND 필터(F7-AC3). 입력 시 자동완성+신규 생성(F7-AC1) — Combobox multi 사용.

---

## 7. 화면별 UX 명세 + ASCII 와이어프레임

> 공통 셸(IA, PRD §7): 상단 **글로벌 검색바**(F8) 고정 + 내비(웹: 좌측 사이드 or 상단 탭 / 모바일: 하단 탭) **캘린더·기술·검색·프로필** + 전역 **빠른추가 FAB(+)**.

### 7a. 캘린더 홈 (노션형 월간 그리드) — F2 ★ 핵심

월간 그리드가 기본. 각 날짜 셀에 **종목 색 점/칩 + 세션 수**(F2-AC1), 오늘 강조(빨강), 빈 날 vs 기록 날 구분(F2-AC2). 셀 클릭 → Day Detail(F2-AC3). 셀의 `+`로 그 날짜 세션 추가(F2-AC4). 월 이동·"오늘로"(F2-AC5).

```
┌──────────────────────────────────────────────────────────────────────┐
│  🔍 검색 (기술·세션·태그…)                          ◴ 오늘로   ◐ 테마  │  ← 상단바 고정
├──────────────────────────────────────────────────────────────────────┤
│  ‹  2026년 5월  ›             [ 월 ] 주(P1) 아젠다(P1)        + 세션    │  ← 월 네비 + 뷰탭 + 추가
├────────┬────────┬────────┬────────┬────────┬────────┬────────┤
│  일    │  월    │  화    │  수    │  목    │  금    │  토    │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│  27    │  28    │  29    │  30    │   1    │   2    │   3    │
│        │ ●2     │        │ ●◆ 3   │        │ ◼1     │        │  ← 종목 점 + 세션수
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│   4    │   5    │   6    │   7    │   8    │   9    │  10    │
│        │ ●◗ 2   │        │ ◼◼ 2   │ ●3     │        │ ⬡1     │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│  11    │  12    │  13    │  14    │  15    │  16    │  17    │
│ ●1     │        │ ◆◼ 2   │        │        │ ●◗ 4   │        │
├────────┼────────┼────────┼────────┼━━━━━━━━┼────────┼────────┤
│  18    │  19    │  20    │  21    ┃  22 ◉ ┃│  23    │  24    │  ← 오늘=빨강 ring/숫자
│        │ ●2     │        │ ●◆◗ 3  ┃ ●◗ 1  ┃│        │        │
├────────┼────────┼────────┼────────┼━━━━━━━━┼────────┼────────┤
│  25    │  26    │  27    │  28    │  29    │  30    │  31    │
│ ◼1     │        │ ●3     │        │ ⬡◆ 2   │ ·오늘  │        │
└────────┴────────┴────────┴────────┴────────┴────────┴────────┘
  ● 주짓수(기, blue)  ◗ 노기(teal)  ◆ 레슬링(amber)  ◼ 타격(orange)  ⬡ MMA(violet)
                                                              ╭─────╮
                                                              │  +  │ ← FAB (빨강)
                                                              ╰─────╯
```

day-cell 동작:
- **기록 있는 날**: 종목 점(최대 3~4개, 초과 시 `+N`) + 우측 세션 수. 표면 살짝 raised(hover E2).
- **빈 날**: 점/숫자 없음, 텍스트 흐림(text-muted). hover 시 옅은 `+` 고스트.
- **오늘**: 날짜 숫자에 빨강 채운 원(`◉`) 또는 셀 테두리 빨강 ring(`--primary`). 미래/과거와 즉시 구분.
- **선택된 날**: 빨강 ring(`focus-ring`)으로 강조.
- 점 색이 곧 종목(§2.6) — 색약 위해 hover/탭 시 종목명 툴팁, 셀 합계 숫자로 보강.

### 7b. 하루 상세 (Day Detail) — F2-AC3 ★ 핵심

선택 날짜의 **세션 목록** → 각 세션의 종목·수업유형·시간·기술·미디어·메모. 그 날짜에 세션 추가(`+`).

```
┌──────────────────────────────────────────────────────────────────────┐
│  ‹ 5월        5월 22일 (목)                              + 세션 추가   │  ← 뒤로 + 날짜 + 추가
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ [〰 노기 주짓수]  드릴 · 60분 · 강도 ●●●○○        ⋮ (수정/삭제)│    │  ← 세션 카드 헤더
│  │ 📍 그래플링 아카데미 · 파트너: 준호                            │    │
│  │ ──────────────────────────────────────────────────────────── │    │
│  │ 다룬 기술                                                      │    │
│  │  ▸ 백 컨트롤 → 보우앤애로우 초크   [〰][BeltBadge 블루·II]      │    │
│  │      "상대 팔 묶고 들어가기" (그날 메모)                        │    │
│  │  ▸ 시팅 가드 → 싱글 엑스        [〰][BeltBadge 블루·0]          │    │
│  │ ──────────────────────────────────────────────────────────── │    │
│  │ 미디어   ▶[내영상 0:42]  ▶[YouTube]  ＋추가                     │    │
│  │ 메모    스윕 타이밍 한 박자 빠르게. 그립 먼저.                  │    │
│  │ 태그    #보우앤애로우  #백테이크  #스윕                         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ [🥊 타격]  스파링 · 30분 · 강도 ●●●●○              ⋮          │    │  ← 같은 날 2번째 세션
│  │ 📍 무에타이 클럽                                               │    │
│  │  ▸ 로우킥 카운터 콤비네이션      [🥊]   (벨트 없음→종목칩만)    │    │
│  │ 미디어  ▶[YouTube]                                            │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

- 세션 카드 = Card(interactive). 헤더에 DisciplineChip(들) + class_type + 시간 + 강도(점 5단계). 빈 날이면 EmptyState("이 날의 첫 세션을 기록하세요 +").
- 기술 행: 기술명 + DisciplineChip + (주짓수면)BeltBadge + 그날 메모(세션-기술 로그). 클릭 → 기술 상세.
- 타격/레슬링 기술엔 BeltBadge 미표시(§4.3) — DisciplineChip만.

### 7c. 세션 추가 / 편집 (빠른 입력, 90초 목표) — F3 / G1 / J1

**모바일 = 바텀시트**(한 손·엄지존), **웹 = 중앙 모달 or 우측 패널**. 필수=종목+날짜만(F3-AC6), 나머지 접힘. 영상 즉시 업로드(J1).

```
모바일 BottomSheet (animate-bs-in)
        ╭──────────────────────────────────────────╮
        │              ▁▁▁ (grab)                   │
        │  세션 추가 — 5월 22일                  ✕   │
        │ ────────────────────────────────────────── │
        │  종목 *                                     │  ← 필수 (1개 이상)
        │  [🥋 기][〰 노기✓][🤼 레슬링][🥊 타격][⬡ MMA]│  ← DisciplineChip 토글
        │                                             │
        │  ▼ 세부 정보 (선택)            [펼치기 ▾]    │  ← 접힘, 90초면 여기서 저장 가능
        │     체육관 [____________]  유형 [드릴 ▾]     │
        │     시간 [60]분  강도 ●●●○○  라운드 [__]    │
        │     파트너 [____________]                   │
        │                                             │
        │  다룬 기술                                  │
        │  [ + 기술 검색/추가 ]   ← 자동완성·신규생성  │
        │   ▸ 보우앤애로우 초크  메모[___________]     │
        │                                             │
        │  미디어                                     │
        │  [📹 촬영/업로드]  [▶ 유튜브 검색/링크]      │  ← 모바일 네이티브 촬영 브릿지
        │   ⏳ clip_042.mp4  ▓▓▓▓▓▓░░ 72%  취소        │  ← 업로드 진행
        │                                             │
        │  태그  #[보우앤애로우] #[백테이크] [+]        │
        │ ────────────────────────────────────────── │
        │           [ 저장 ]  ← 풀폭 빨강 lg CTA        │  ← safe-area-bottom
        ╰──────────────────────────────────────────╯
```

- "저장"은 풀폭 primary(빨강 lg). 종목 1개만 골라도 저장 가능 → 마찰 최소(P1).
- 저장 성공: 빨강 체크 펄스 + 토스트 "저장됨", 시트 닫히고 캘린더/상세 즉시 반영(F3-AC5).
- 신규 기술 생성은 인라인(검색→없으면 "+ 새 기술 만들기").

### 7d. 기술 라이브러리 목록 + 기술 상세 — F4 / F5 / F6 ★ 상세 핵심

**목록**: 카드 그리드. 각 카드에 DisciplineChip + (주짓수)BeltBadge + 대표 썸네일(F4-AC2). 분류/포지션/벨트/종목 필터(F4-AC4).

```
기술 라이브러리 목록
┌──────────────────────────────────────────────────────────────────────┐
│  기술 라이브러리                                          + 기술 추가  │
│  필터: [종목▾][분류▾][포지션▾][벨트▾]   정렬[최근▾]                    │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │ ▤ 썸네일     │ │ ▤ 썸네일     │ │ ▤ (영상없음) │ │ ▤ 썸네일     │      │
│  │             │ │             │ │   placeholder│ │             │      │
│  │ 보우앤애로우 │ │ 시팅가드 스윕│ │ 로우킥 카운터│ │ 더블렉 TD    │      │
│  │ [〰][블루·II]│ │ [〰][블루·0] │ │ [🥊]         │ │ [🤼]         │      │
│  │ 서브미션·백  │ │ 스윕·오픈가드│ │ 킥·-         │ │ 테이크다운   │      │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
```

**기술 상세**(F4-AC3 / F5 / F6): 설명·디테일·내 영상·참고 유튜브·주의점(빨강 박스)·"이 기술을 다룬 세션들"(역참조).

```
기술 상세
┌──────────────────────────────────────────────────────────────────────┐
│  ‹ 라이브러리                                            수정  ⋮       │
│                                                                        │
│  보우앤애로우 초크                                                     │  ← heading-l
│  [〰 노기 주짓수]   [BeltBadge 블루 · II]   서브미션 · 백 컨트롤        │  ← 종목+벨트+분류·포지션
│ ────────────────────────────────────────────────────────────────────  │
│  ┌────────────────────────────┐   ┌────────────────────────────┐      │
│  │ ▶ 내 영상  0:42             │   │ ▶ YouTube — "Bow & Arrow…" │      │  ← 미디어: 내영상 | 유튜브
│  │   [재생 ▷]  (서명 URL/비공개)│   │   [임베드 재생]             │      │     나란히 (§9)
│  └────────────────────────────┘   └────────────────────────────┘      │
│                                                                        │
│  설명                                                                  │
│  깃과 다리로 상대를 활처럼 당겨 조르는 백 초크. 라펠 그립…            │  ← body, 마크다운
│                                                                        │
│  ┃▌ 주의점 / 디테일                                                    │  ← ★ 빨강 강조 박스(F6)
│  ┃▌  • 팔꿈치 안쪽으로 깃을 깊게. 손목 회내(回內).                      │     좌측 빨강 바 + red-50 배경
│  ┃▌  • 다리로 상대 어깨 컨트롤 먼저, 그 다음 텐션.                      │     (dark: red-900 틴트)
│  ┃▌  • 목만 당기면 풀림 — 견갑 고정이 핵심.                            │
│                                                                        │
│  태그   #보우앤애로우  #백테이크                                       │
│ ────────────────────────────────────────────────────────────────────  │
│  이 기술을 다룬 세션  (역참조)                                         │
│   • 5/22(목) 노기 드릴 — "팔 묶고 들어가기"                            │
│   • 5/16(금) 노기 스파링                                               │
└──────────────────────────────────────────────────────────────────────┘
```

### 7e. 검색 결과 (타입별 그룹) — F8

상단 검색바에서 진입. 결과를 **기술 / 세션 / 태그** 그룹핑(F8-AC3), 부분일치(한글, pg_trgm) 하이라이트.

```
┌──────────────────────────────────────────────────────────────────────┐
│  🔍 "보우앤애로우"                                              ✕      │
├──────────────────────────────────────────────────────────────────────┤
│  기술 (2)                                                              │
│   ▸ [〰][블루·II] 보우앤애로우 초크 — 서브미션·백 컨트롤                │  ← 키워드 하이라이트
│   ▸ [〰] 보우앤애로우 디펜스                                           │
│  세션 (3)                                                              │
│   ▸ 5/22(목) 노기 드릴 — "…보우앤애로우…"                              │
│   ▸ 5/16(금) 노기 스파링                                               │
│   ▸ 4/30(수) 노기                                                      │
│  태그 (1)                                                              │
│   ▸ #보우앤애로우  (12개 항목)                                         │
└──────────────────────────────────────────────────────────────────────┘
```

- 그룹 헤더 = heading-xs + 카운트. 각 행 클릭 → 해당 상세(F8-AC3).
- 빈 결과 EmptyState. (P1) 종목·벨트·기간 패싯(F8-AC4)을 좌측/상단 칩으로.

### 7f. 태그 보기 — F7-AC2/AC3

태그 선택 시 그 태그가 달린 **세션·기술 모아보기**, 다중 태그 AND 필터.

```
┌──────────────────────────────────────────────────────────────────────┐
│  태그 보기                                                             │
│  선택: [#스윕 ✕] [#백테이크 ✕]   (AND)        모든 태그 ▾             │  ← TagChip removable
│ ────────────────────────────────────────────────────────────────────  │
│  기술 (4)                                                              │
│   ▸ [〰][블루·0] 시팅가드 스윕     ▸ [●][블루·I] 시저 스윕             │
│  세션 (2)                                                              │
│   ▸ 5/22(목) 노기 드릴           ▸ 5/7(수) 노기                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. 캘린더 UX 디테일 — F2 / 부록(react-calendar)

- **Month grid 동작**: `react-calendar` 기반, day-cell을 커스텀 렌더(`tileContent`로 종목 점 + 세션 수, `tileClassName`으로 상태 클래스). 셀 클릭=Day Detail, 셀 내 `+`=해당 날짜 세션 추가.
- **Today highlight**: 오늘 날짜 = 빨강 채운 원 또는 셀 ring(`--primary`). 항상 1개만, 가장 강한 빨강 신호.
- **Empty vs Logged**: 빈 날 = 숫자 muted + 콘텐츠 없음(hover 시 `+` 고스트). 기록 날 = 종목 점(들) + 세션 수 배지(`text-body-xxs-500`, tabular-nums) + 표면 미세 raised.
- **Day-cell density**: 종목 점 최대 3~4 노출, 초과 `+N`. 데스크톱은 셀 안에 점+수, 정보 더 보임. 한 셀에 같은 종목 중복 시 점 1개(종류 표현 우선).
- **Week / Agenda (P1)**: 상단 탭으로 월/주/아젠다 토글(F2-AC6). 주간=시간축 리스트, 아젠다=날짜 내림차순 세션 리스트(검색·복습 친화).
- **반응형 collapse(모바일)**: 좁은 폭에서 7열 그리드 유지하되 셀을 정사각→세로 압축, 점은 유지·세션 수는 점 옆 소형. 매우 좁으면(<360px) **아젠다(리스트) 뷰를 기본**으로 자동 전환 옵션. 월 네비는 스와이프(좌우) 지원.
- **월 전환 모션**: 슬라이드 200ms(`--ease-standard`), reduced-motion 시 fade만.

---

## 9. 미디어 표시 — F5 / F6

### 9.1 내 영상 카드 vs 유튜브 카드

| | **내 영상(upload)** | **유튜브(youtube)** | **외부 링크(external)** |
|--|--------------------|--------------------|------------------------|
| 썸네일 | 자동/수동 추출(F5-AC5), 없으면 placeholder | 유튜브 기본 썸네일 | 도메인 favicon + URL 미리보기 |
| 배지 | "내 영상" + 길이(0:42) | ▶ YouTube 로고/라벨 | 🔗 링크 |
| 재생 | 인앱 플레이어, **서명 URL·비공개**(F5-AC4, 본인만) | 인라인 임베드(iframe) | 새 탭/외부 |
| 보더 | Card media, radius-m | 동일 | 동일 |

```
내 영상 카드                          유튜브 카드
┌──────────────────────────┐         ┌──────────────────────────┐
│  ▤ 썸네일      ▷           │         │  ▤ YT썸네일    ▷           │
│                  0:42      │         │            ▶ YouTube      │
│ ──────────────────────────│         │ ──────────────────────────│
│ 내 영상 · clip_042.mp4     │         │ "Bow and Arrow Choke…"     │
└──────────────────────────┘         └──────────────────────────┘
   비공개 ⠿ 본인만 재생                  채널명 · 임베드
```

### 9.2 업로드 진행 UI (F5-AC1)
하이브리드 정책: 짧은 클립만 Storage 직업로드, 길면 유튜브 유도(안내 인라인).

```
┌──────────────────────────────────────────┐
│ 📹 clip_042.mp4                            │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  72%   [취소]          │  ← 진행률 바(빨강), 취소
└──────────────────────────────────────────┘
실패 시:
┌──────────────────────────────────────────┐
│ ⚠ 업로드 실패  clip_042.mp4   [다시 시도]  │  ← danger inline, 재시도
└──────────────────────────────────────────┘
한도 초과 시(안내):
┌──────────────────────────────────────────┐
│ ⓘ 60초·100MB 초과. 유튜브(비공개/미등록)   │  ← info, 유튜브 경로 유도
│   링크로 추가하세요.  [유튜브로 추가]       │
└──────────────────────────────────────────┘
```

### 9.3 주의점(빨강 강조) 박스 — F6-AC2 ★

기술 상세의 **디테일/주의점**을 시각적으로 강조. **좌측 빨강 바 + `--primary-soft` 배경 + 빨강 헤더 아이콘**.

```
┃▌ ⚠ 주의점 / 디테일
┃▌  • 팔꿈치 안쪽으로 깃을 깊게.
┃▌  • 견갑 고정이 핵심.
```
- 좌측 4px 빨강 바(`--primary`), 배경 `--primary-soft`(light=red-50 / dark=red-900 틴트), 헤더 텍스트 `--danger` 톤, 본문은 `--text-default`(대비 유지).
- 빨강 신호의 정당한 사용처(P4) — "주의"라는 의미가 빨강과 정합.
- 색약 대응: ⚠ 아이콘 + "주의점" 라벨 항상 병기.

---

## 10. 접근성 · 반응형 · 웹·모바일 패리티

### 10.1 접근성 (A11y)
- **색약 대응(F9-AC4)**: 모든 도메인 색에 **색 + 아이콘 + 텍스트** 3중 인코딩. 종목=아이콘 필수, 벨트=라벨 필수, 상태(success/danger/warning)=아이콘+텍스트. 캘린더 점은 hover/탭 툴팁 + 세션 수로 보강(점 모양 차등 옵션).
- **대비비(WCAG AA)**: 본문 텍스트 ≥ 4.5:1(`text-default`/`text-strong` on surface 충족), 큰 텍스트·UI 그래픽 ≥ 3:1. primary `#E11D2A` on white ≈ 4.8:1(그래픽/큰 텍스트 OK) — **작은 빨강 텍스트는 `red-700/800`** 사용. dark 표면 빨강은 `red-400/500`로 대비 확보. 흰띠 배지는 ring으로 비텍스트 대비 3:1 확보.
- **포커스 가시성**: 모든 인터랙티브에 `focus-visible` 빨강 ring(`--ring-focus`, 3px). 키보드 내비(탭 순서, 캘린더 화살표 이동, 다이얼로그 focus-trap·Esc, Combobox ↑↓/Enter/Esc).
- **터치 타깃**: 최소 **44×44px**(IconButton·day-cell `+`·칩 ×·탭). 칩 자체는 작아도 hit-area 확장.
- **시맨틱/ARIA**: 캘린더 grid role, 배지 `aria-label`, 토스트 `role="status"`, 모달 `role="dialog" aria-modal`. 이미지/썸네일 alt.
- **모션 저감**: `@media (prefers-reduced-motion: reduce)` → 슬라이드/펄스 제거, opacity만.
- **다크 모드 대비**: 위 semantic 토큰이 양 모드 모두 AA 충족하도록 값 선택(특히 muted 텍스트·border).

### 10.2 반응형
- **Breakpoints(권장)**: `sm 640 / md 768 / lg 1024 / xl 1280`.
- **레이아웃**: 모바일=하단 탭 + 단일 컬럼 + 바텀시트 폼. 태블릿/웹=좌측 사이드 내비 + 본문(캘린더 풀 그리드, 상세는 우측 패널 or 모달, 기술 그리드 2~4열).
- **캘린더**: 데스크톱 셀 정보 풍부, 모바일 압축/아젠다 전환(§8).
- **미디어**: 내영상·유튜브 카드 데스크톱 2열 나란히, 모바일 세로 스택.
- **검색바**: 데스크톱 상단 인라인, 모바일 탭/아이콘→풀스크린 검색.

### 10.3 웹·모바일 패리티 (WebView) — 부록A / R3
- **동일 웹 UI**가 Expo WebView로 렌더(부록A) → 디자인은 web-first, 토큰·컴포넌트 1세트로 양쪽 커버.
- **Safe-area**: `env(safe-area-inset-*)`로 상단바·FAB·바텀시트·하단 탭·저장 CTA에 패딩. 하단 CTA는 항상 safe-area 위.
- **터치 우선**: hover 의존 금지(기존 `pointer-hover` variant 활용해 hover는 pointer:fine에만). 모든 hover 정보는 탭/포커스로도 접근 가능.
- **네이티브 촬영 브릿지(F5-AC1, R3)**: "촬영/업로드" 버튼은 WebView↔Expo 브릿지로 네이티브 카메라/갤러리 호출. P0는 갤러리 업로드부터(R3 대응). UI는 동일, 호출만 브릿지.
- **WebView 성능**: 무거운 그림자/blur 남용 자제(저사양 기기), CSS 변수·정적 클래스 위주(§5 권고와 정합). 긴 리스트 가상화 고려(R2 성능).
- **테마 동기화**: native 다크 설정을 `data-theme`로 WebView에 주입 → OS 일관.

---

## 11. 오픈 디자인 이슈 (Open Design Issues)

| # | 이슈 | 메모 | PRD 연계 |
|---|------|------|---------|
| D1 | **제품명/로고/워드마크 미정** | 가칭 RollLog. 로고 확정 전까지 워드마크는 검정/빨강 텍스트 로고타입으로 임시. 흰·검·빨 정체성과 정합. | O1 |
| D2 | **종목 아이콘 최종 아트워크** | 개념(gi-collar/wave/grip/glove/octagon) 확정, 실제 라인 아이콘 SVG 제작 필요. 단색 `currentColor`. | F9-AC2 |
| D3 | **dark/light 토큰 중복 정의** | `@media prefers-color-scheme` dark 블록을 `[data-theme=dark]`와 공유할지(`:where()` 그룹) 구현 시 정리. FOUC 방지 인라인 스크립트 필요. | §2.7/2.8 |
| D4 | **기존 blue `--color-primary-*` 제거 범위** | 재테마 시 기존 컴포넌트가 primary blue를 참조하면 red로 교체. 템플릿 잔재(recipe-match) 정리 필요. | §2.7 |
| D5 | **영상 한도 수치(초/MB) 미확정** | 업로드 안내 문구의 "60초·100MB"는 임시. Develop 측정 후 확정 시 UI 문구 동기화. | O2 / F5-AC1 |
| D6 | **캘린더 점 모양 차등(색약 강화)** | 색 외 모양(원/반원/마름모/사각/육각) 차등을 정식 채택할지 사용성 테스트 필요(과하면 노이즈). | F9-AC4 |
| D7 | **타격 세부 스타일(무에타이/킥복싱/복싱) 시각 구분** | 현재 `striking` 단일 색 + 스타일 태그. P1에서 칩 보조 라벨/서브색 검토. | O3 / §4.1 |
| D8 | **강도(intensity) 시각 표현** | 점 5단계(●●●○○) 채택. 빨강 vs 중립 — 강도는 중립 점(빨강 신호 보존) 권장, 확정 필요. | F3-AC1 |
| D9 | **danger 빨강 vs primary 빨강 운영 검증** | 형태(solid=primary, outline+확인=danger)로 구분하는 규칙의 실사용 혼동 여부 QA 필요. | §2.4 |

---

## 부록. 디자인 ↔ PRD 기능 매핑

| 기능 | 본 문서 주요 섹션 |
|------|-------------------|
| F1 인증/프로필/랭크 | §7 셸/프로필, BeltBadge(랭크), 다크 토글 위치 |
| F2 캘린더 | §7a, §8 |
| F3 세션 기록 | §7c |
| F4 기술 라이브러리 | §7d |
| F5 미디어 | §9 |
| F6 메모/주의점 | §9.3 CautionBox |
| F7 태그/태그검색 | §6.3 TagChip, §7f |
| F8 글로벌 검색 | §5(SearchBar), §7e |
| F9 벨트/종목 비주얼 | §2.5, §2.6, §6.1, §6.2 |
| F10 통계(P1) | (P1, 본 문서 범위 외 — 토큰/차트색 추후) |
| F11 공유(P2) | (P2 범위 외) |
