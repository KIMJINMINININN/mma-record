# 체육관/팀 스페이스 Phase ② — 코치 열람 · 피드백 (설계, 2026-06-10)

> Phase ①(생성·초대·가입, `2d14e8e`+`7037753`) 위에 **관원이 공유한 기록을 코치가 열람하고 양방향 피드백**.
> Phase ① 프라이버시 결정("관원 기록=명시적 공유만") 그대로 준수 — 코치는 관원이 **체육관에 공유한 것만** 본다.

## 0. 잠긴 결정 (사장님 확정)
- **열람 모델 = 관원이 '체육관에 공유'한 것만.** 코치 자동 전체열람 아님. 관원 주도.
- **공유 단위 = 세션 + 기술 둘 다.**
- **피드백 = 코치 ↔ 관원 양방향 코멘트.**

## 1. 가시성/권한 모델 (핵심)
- 한 **gym_share**(관원이 체육관에 공유한 1개 세션/기술)는 **{공유한 관원, 체육관 관장}** 에게만 보인다. (MVP: 동료 관원에겐 안 보임 — 코치 피드백 채널. 동료 공개는 후속.)
- 코멘트도 동일 권한({공유 관원, 관장})에게 읽기/쓰기.
- ⚠️ **F11 공개 토큰 공유를 재사용하지 않는다.** F11은 token 보유자 누구나(anon) 열람 = 공개. 여기선 "체육관 한정" 프라이버시라 **gym 멤버십+소유 기반 RLS/RPC**로 격리한다(공개 토큰 금지).

## 2. 데이터 모델 — 마이그레이션 `0029_gym_shares.sql`
```sql
create table gym_shares (
  id            uuid primary key default gen_random_uuid(),
  gym_id        uuid not null references gyms(id) on delete cascade,
  member_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  resource_type text not null check (resource_type in ('session','technique')),
  resource_id   uuid not null,             -- sessions.id 또는 techniques.id (소유=member_id, RPC서 검증)
  created_at    timestamptz not null default now(),
  unique (member_id, resource_type, resource_id)   -- 같은 항목 중복 공유 방지
);
create index gym_shares_gym_idx on gym_shares (gym_id, created_at);

create table gym_comments (
  id            uuid primary key default gen_random_uuid(),
  gym_share_id  uuid not null references gym_shares(id) on delete cascade,
  author_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body          text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at    timestamptz not null default now()
);
create index gym_comments_share_idx on gym_comments (gym_share_id, created_at);
```
- RLS: 둘 다 enable + 백스톱 정책(공유 관원 OR 관장). 접근은 전부 security-definer RPC 경유(0027/0025 패턴).
- 헬퍼 재사용: `current_user_gym_id()`. 추가로 "이 gym_share를 볼 수 있나"는 RPC 내부에서 (member_id=auth.uid() OR gym 관장) 검사.

## 3. RPC (security definer; comments 0025 패턴)
| RPC | 동작 | 권한 |
|---|---|---|
| `share_to_gym(p_resource_type, p_resource_id)` | 본인 소유 세션/기술을 체육관에 공유(upsert) | 소속 + 리소스 소유(sessions/techniques.user_id=auth.uid()) 검증 |
| `unshare_from_gym(p_resource_type, p_resource_id)` | 공유 해제 | 공유 관원 본인 |
| `list_my_gym_shares(p_resource_type)` | 내가 공유한 resource_id 집합(토글 상태용) | 본인 |
| `get_gym_feed()` | 관장=체육관 전체 공유 피드 / 관원=본인 공유. 각 항목: 공유자명·타입·요약(제목·날짜)·코멘트수 | 소속 |
| `get_gym_shared_detail(p_gym_share_id)` | 공유된 세션/기술 풀 상세(jsonb) — get_shared_session/technique 미러(토큰 대신 gym 권한) | 공유 관원 OR 관장 |
| `get_gym_comments(p_gym_share_id)` | 코멘트 목록(author_name=display_name, can_delete) | 공유 관원 OR 관장 |
| `add_gym_comment(p_gym_share_id, p_body)` | 코멘트 작성 | 공유 관원 OR 관장(둘 다 — 양방향) |
| `delete_gym_comment(p_comment_id)` | 삭제 | 작성자 OR 관장 |
- **H1 교훈 적용**: 모든 함수 `revoke execute from public` + authenticated에만 grant(0028 패턴). anon grant 없음(전부 로그인 필요).
- get_gym_shared_detail: 기존 get_shared_session/technique의 jsonb 빌더를 gym 권한 버전으로 재작성(토큰 조회 대신 gym_share_id→권한검사). 미디어는 업로드 서명URL 제약 동일(youtube/external만, 0024와 동일 정책).

## 4. 웹 (FSD)
- `features/gym-share`: **"체육관에 공유" 토글**(세션 카드 day-detail + TechniqueDetailView 헤더 — 별표/공유 버튼 옆). 소속자에게만 노출. share_to_gym/unshare + list_my_gym_shares로 상태.
- `entities/gym-share`: zod + 쿼리(get_gym_feed/get_gym_shared_detail/get_gym_comments).
- `/gym/feed` 라우트((app) 인증가드): **GymFeed** — 관장=전체/관원=본인, 항목 클릭→상세 + 코멘트. 프로필 "내 체육관"에 "피드 보기" 링크.
- 코멘트 섬: share-comments(0025) 패턴 gym 버전(rpc 직접 + 권한은 서버).

## 5. 작업 순서 / 배포
1. `0029_gym_shares.sql` → **db:push(코드 먼저)**.
2. types.ts RPC 수동 추가.
3. entities/gym-share + features/gym-share(토글) + /gym/feed + 코멘트 섬 + 프로필 링크.
4. vitest + tsc·lint·build 게이트 → 커밋.

### 단계적 전달(권장)
- **2a**: gym_shares + 토글 + get_gym_feed(요약 목록).
- **2b**: get_gym_shared_detail(코치가 풀 상세 열람).
- **2c**: gym_comments(양방향 피드백).

## 6. 비범위 (Phase ③+)
- 동료 관원 간 공개(피어 피드) · 공용 커리큘럼(코치 발행) · 푸시 알림(코치 피드백→관원, 0026 파이프라인 확장 후보) · 코치 역할(coach) 분리 권한.

## 7. 열린 소소한 결정
- 공유 해제 시 코멘트도 함께 삭제(cascade) — 그렇게 둠.
- 리소스(세션/기술) 자체가 삭제되면? gym_shares.resource_id는 FK 없음(다형) → get_gym_shared_detail이 원본 없으면 'deleted'로 처리(피드에선 표시하되 상세 불가) 또는 정리 트리거. MVP: 상세 RPC가 null이면 "삭제된 기록" 안내.
