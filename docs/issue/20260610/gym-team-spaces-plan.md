# 체육관/팀 스페이스 — 설계 (Phase ① MVP, 2026-06-10)

> 1인용 MatLog → **관장이 체육관을 만들고 관원을 초대**하는 다인 구조의 첫 단계.
> PRD §12("나중에 코치/동료 공유" — visibility/shares 토대)의 자연스러운 확장.

## 0. 잠긴 결정 (사장님 확정)
- **MVP 범위 = ① 체육관 생성 + 초대 + 가입만.** (코치의 관원 기록 열람·코멘트 = Phase ②, 공용 커리큘럼 = Phase ③ — 본 문서 범위 밖)
- **관원 기록 프라이버시 = 명시적 공유만.** 가입해도 기록은 기본 private. 공유는 기존 F11(세션/기술 링크 공유)로 관원이 직접. → **이 기능은 "기록 접근 권한"을 만들지 않는다.** 순수하게 소속/명단/초대만.
- **1체육관/계정.** `gym_members.user_id` unique로 강제.

## 1. 역할
- `owner`(관장) · `coach`(코치) · `member`(관원) enum으로 두되 **Phase ①은 owner/member만 사용**(coach는 Phase ②에서 활성). 관장 = 체육관 생성자, 자동 owner 멤버.

## 2. 데이터 모델 — 마이그레이션 `0027_gyms.sql`
```sql
create table gyms (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  invite_code text not null unique,           -- 짧은 공유 코드(회전 가능)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table gym_members (
  gym_id    uuid not null references gyms(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner','coach','member')),
  joined_at timestamptz not null default now(),
  primary key (gym_id, user_id),
  unique (user_id)                            -- ★ 1체육관/계정 강제
);
create index gym_members_user on gym_members(user_id);
```

### 초대 방식 (확정: 체육관 단위 코드)
- gym에 `invite_code`(예: 8자 base32) 1개. 관장이 코드/링크(`/gym/join/<code>`) 공유 → 관원 입력/오픈해 가입.
- 코드 유출 대비: 관장이 **회전(rotate)** 가능. 승인제·1회용 토큰은 후속(과한 구현 회피).

## 3. RLS — ⚠️ 재귀 함정 회피가 핵심
`gym_members` select 정책에서 다시 `gym_members`를 조회하면 **무한 재귀**(Postgres RLS 고전 함정). → **security definer 헬퍼로 우회.**
```sql
-- RLS를 우회해 "내 체육관 id"를 1번에 반환(1체육관/계정이라 단일값).
create function current_user_gym_id() returns uuid
  language sql security definer stable
  set search_path = public as $$
  select gym_id from gym_members where user_id = auth.uid() limit 1;
$$;

alter table gyms enable row level security;
alter table gym_members enable row level security;

-- gyms: 내 체육관만 읽기 / 관장만 수정·삭제 (insert는 RPC 경유)
create policy gyms_select  on gyms for select using (id = current_user_gym_id());
create policy gyms_update  on gyms for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy gyms_delete  on gyms for delete using (owner_id = auth.uid());

-- gym_members: 같은 체육관 멤버끼리 명단 열람 / 본인 탈퇴 / 관장 강퇴
create policy gm_select       on gym_members for select using (gym_id = current_user_gym_id());
create policy gm_delete_self  on gym_members for delete using (user_id = auth.uid());
create policy gm_delete_owner on gym_members for delete
  using (exists (select 1 from gyms g where g.id = gym_members.gym_id and g.owner_id = auth.uid()));
```

## 4. RPC (전부 security definer + authenticated grant — F11 패턴 답습)
| RPC | 동작 | 가드 |
|---|---|---|
| `create_gym(p_name)` | 코드 생성 + gyms insert + owner 멤버십 insert (원자적) | `current_user_gym_id() is null`(이미 소속이면 거부) |
| `join_gym(p_invite_code)` | 코드로 gym 찾아 member 멤버십 insert | 이미 소속 거부 / 코드 무효 거부 |
| `get_gym_by_invite_code(p_code)` | 가입 전 미리보기(체육관명·인원수만) | 유효 코드만, 최소 정보 |
| `get_my_gym()` | 내 체육관 + 멤버 명단(display_name['익명' fallback], role) | 미소속이면 null |
| `rotate_gym_invite_code()` | 코드 재발급 | 관장만 |
| `leave_gym()` | 본인 멤버십 삭제 | 관장은 불가(체육관 삭제로만) |
| `remove_gym_member(p_user_id)` | 관원 강퇴 | 관장만, 본인/관장 제외 |
| `delete_gym()` | 체육관 삭제(cascade로 멤버십 정리) | 관장만 |

- `invite_code` 생성: `encode(gen_random_bytes(5),'base32')` 류 + unique 충돌 시 재시도. 헷갈리는 문자 제거(선택).
- 멤버 명단의 이름: `profiles.display_name`(코멘트 작업서 쓰던 것), 이메일 등 PII 비노출.

## 5. 웹 UI (FSD)
- `entities/gym/` — 타입 + `get_my_gym` 쿼리.
- `features/gym-create/` — 생성 폼 + 액션.
- `features/gym-join/` — 코드 입력 가입 + `/gym/join/[code]` 링크 진입(미리보기→가입).
- `features/gym-manage/` — 관장: 이름 변경·코드 회전·명단/강퇴·삭제.
- 진입점: **프로필 탭에 "내 체육관" 섹션** (미소속=생성/가입 CTA, 소속=체육관명·명단·(관장)관리). 별도 탭 추가는 보류(가벼운 MVP).
- `types.ts`에 신규 RPC 수동 추가(db:types 멱등 — 프로젝트 관용구).

## 6. 작업 순서 / 배포
1. **`0027_gyms.sql`** 작성 → 로컬 `supabase db reset` 검증 → **db:push(코드보다 먼저)** — RPC 부재 시 UI가 깨지므로 스키마 선적용 (F11 0024 교훈).
2. `entities/gym` + create/join/manage + 프로필 진입점.
3. vitest(쿼리/액션/폼 상태) + tsc·lint·build 게이트.
4. 커밋(브랜치) → 머지 → 자동 배포.

## 7. 명시적 비범위 (Phase ②/③, 본 작업 제외)
- 코치의 관원 기록 열람/피드백(코멘트) · 체육관 공용 커리큘럼 · 다중 소속 · 승인제/1회용 초대 토큰 · owner 권한 이양(transfer).

## 8. 열린 소소한 결정
- 관장이 떠나려면? → MVP: **탈퇴 불가, 체육관 삭제로만**(이양은 후속). 
- 체육관 1개 강제이므로, 이미 소속된 사용자가 새 코드로 가입 시도 → "이미 체육관에 소속됨"(탈퇴 후 가능) 안내.
- 모바일: 웹 UI를 WebView로 그대로 노출(네이티브 추가 작업 0).
