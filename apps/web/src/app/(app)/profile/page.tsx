import { Button } from '@/shared/ui';
import { ProfileRankEditor } from '@/features/edit-profile';
import type { ProfileUpdate, ReminderUpdate } from '@/entities/profile';
import type { UserRankUpsert } from '@/entities/rank';
import type { RankTrack } from '@/shared/model/enums';
import { createSupabaseServerClient } from '@/shared/api/supabase/server';
import { isAuthEnabled } from '@/shared/api/supabase/env';
import { logout } from '@/app/(auth)/actions';

/**
 * 프로필 + 종목별 랭크 (F1 / PRD §7) — 계정 정보 + 로그아웃 + 표시명/타임존/랭크 편집(5b).
 *
 * RSC는 정적으로 유지한다(인프라-last): 계정 정보(이메일/userId)만 env 게이팅으로 getUser()를
 * 호출하고(플래그 OFF면 호출 없음 → 정적), 편집 UI는 클라이언트 섬(ProfileRankEditor)에 위임한다.
 * 인프라 전이라 편집 초기값은 가짜 데이터 없이 빈/기본값을 내려준다(저장은 도먼시 — env 게이팅).
 *
 * SSoT: docs/mma/Develop.md §0003·§0004 / PRD F1-AC3·AC4
 */

/** 인프라 전 도먼시 기본값 — 가짜 데이터 금지(빈 표시명 / 서울 타임존). */
const DORMANT_PROFILE: ProfileUpdate = { display_name: '', timezone: 'Asia/Seoul' };
/** 리마인더 도먼시 기본값 — 0023_reminder.sql 컬럼 default와 동일(off / 요일 없음 / 저녁 7시). */
const DORMANT_REMINDER: ReminderUpdate = {
  reminder_enabled: false,
  reminder_days: [],
  reminder_time: '19:00',
};

export default async function ProfilePage() {
  let email: string | null = null;
  let userId: string | null = null;
  // 인프라 전(플래그 OFF)·행 부재 시 도먼시 기본 유지 — 가짜 데이터 금지.
  let initialProfile: ProfileUpdate = DORMANT_PROFILE;
  let initialRanks: Partial<Record<RankTrack, UserRankUpsert>> = {};
  let initialReminder: ReminderUpdate = DORMANT_REMINDER;

  if (isAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? null;
    userId = data.user?.id ?? null;

    if (userId) {
      // 본인 profiles 1행 + user_ranks 전 트랙 병렬 로드(RLS 소유자 한정).
      // 저장 액션이 revalidatePath('/profile')하므로 갱신 후 재진입 시 최신값이 다시 내려간다.
      const [{ data: profile }, { data: rankRows }] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, timezone, reminder_enabled, reminder_days, reminder_time')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('user_ranks')
          .select('track, belt, stripes, level, visibility')
          .eq('user_id', userId),
      ]);

      if (profile) {
        initialProfile = { display_name: profile.display_name, timezone: profile.timezone };
        initialReminder = {
          reminder_enabled: profile.reminder_enabled,
          reminder_days: profile.reminder_days,
          reminder_time: profile.reminder_time,
        };
      }
      if (rankRows) {
        const byTrack: Partial<Record<RankTrack, UserRankUpsert>> = {};
        for (const r of rankRows) {
          byTrack[r.track] = {
            track: r.track,
            belt: r.belt,
            stripes: r.stripes,
            level: r.level,
            visibility: r.visibility,
          };
        }
        initialRanks = byTrack;
      }
    }
  }

  return (
    <section aria-labelledby="profile-heading" className="mx-auto max-w-3xl">
      <h1 id="profile-heading" className="mb-1 text-heading-l text-[var(--text-strong)]">
        프로필
      </h1>
      <p className="mb-5 text-body-s-400 text-[var(--text-muted)]">
        계정과 종목별 랭크를 관리합니다.
      </p>

      {/* 계정 정보 + 로그아웃 */}
      <div className="mb-5 flex items-center justify-between gap-3 rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4">
        {isAuthEnabled() ? (
          <div className="min-w-0">
            <p className="truncate text-button-m text-[var(--text-strong)]">
              {email ?? '이메일 없음'}
            </p>
            {userId ? (
              <p className="mt-0.5 truncate text-body-xs-400 text-[var(--text-muted)]">
                {userId}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-body-s-400 text-[var(--text-muted)]">
            로그인 미연결(인프라 후 활성화)
          </p>
        )}
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            로그아웃
          </Button>
        </form>
      </div>

      {/* 표시명/타임존 + 리마인더 + 종목별 랭크 편집 (클라이언트 섬) — 저장은 도먼시(env 게이팅) */}
      <ProfileRankEditor
        initialProfile={initialProfile}
        initialRanks={initialRanks}
        initialReminder={initialReminder}
      />
    </section>
  );
}
