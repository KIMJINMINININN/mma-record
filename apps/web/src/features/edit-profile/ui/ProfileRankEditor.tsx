'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { BeltBadge, BELT_META } from '@/entities/rank';
import type { UserRankUpsert } from '@/entities/rank';
import type { ProfileUpdate } from '@/entities/profile';
import { BELTS, RANK_TRACKS, type Belt, type RankTrack } from '@/shared/model/enums';
import { Button } from '@/shared/ui';
import { updateProfile, upsertRank, type EditResult } from '../api/profile-actions';
import { TIMEZONES, DEFAULT_TIMEZONE } from '../model/timezones';

/**
 * ProfileRankEditor — 프로필(표시명/타임존) + 종목별 랭크 편집 클라이언트 섬 (F1-AC3·AC4).
 *
 * `/profile`(RSC)는 정적으로 유지하고(인프라-last), 이 섬만 클라이언트 경계를 갖는다.
 * 호스트가 초기값(인프라 전: 빈/기본값)을 props로 내려준다 — 컴포넌트는 가짜 데이터를 만들지 않는다.
 *
 * 저장은 **인프라 연결 전까지 도먼시**다(NEXT_PUBLIC_AUTH_ENABLED OFF):
 * action이 네트워크 호출 없이 dormant 안내를 반환하고, 폼은 토스트로 알리되 입력을 비우거나
 * 가짜 성공을 표시하지 않는다(SessionEditorForm 패턴 미러). 플래그를 켜면 그대로 update/upsert가 동작.
 *
 * 랭크 모델(track 단위): bjj 트랙만 벨트(gi·nogi 공유), 비bjj는 레벨(미설정/입문/중급/고급).
 */

/** Input 원자와 동일 토큰 스타일의 native 컨트롤 클래스(select 공용 — F3 FIELD_BASE 관용구). */
const FIELD_BASE = [
  'w-full rounded-xs px-3',
  'bg-[var(--surface-base)] text-body-m-400 text-[var(--text-strong)]',
  'border border-[var(--border-strong)]',
  'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
  'outline-none focus-visible:shadow-[var(--ring-focus)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

/** 라벨 + 컨트롤 세로 묶음(Input 원자 래퍼와 동일 간격 — F3 Field 관용구). */
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-body-s-500 text-[var(--text-default)]">
        {label}
      </label>
      {children}
    </div>
  );
}

/** 섹션 헤더 — 카드 묶음 위 라벨. */
function CardSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4">
      <h2 className="text-heading-xs text-[var(--text-strong)]">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-body-xs-400 text-[var(--text-muted)]">{description}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** 랭크 트랙 한글 라벨 (PRD §4.3). */
const TRACK_LABELS: Record<RankTrack, string> = {
  bjj: '주짓수',
  wrestling: '레슬링',
  striking: '타격',
  mma: 'MMA',
};

/** 비bjj 레벨 옵션. 빈 문자열 = 미설정(level null). */
const LEVEL_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: '미설정' },
  { value: '입문', label: '입문' },
  { value: '중급', label: '중급' },
  { value: '고급', label: '고급' },
] as const;

/** stripes 선택지 (0~4). */
const STRIPE_OPTIONS = [0, 1, 2, 3, 4] as const;

/** action 결과 → 토스트 (도먼시는 가짜 성공 금지: info로 솔직히 안내). */
function notify(res: EditResult) {
  if (res.ok) {
    toast.success('저장됨');
  } else if (res.dormant) {
    toast.info(res.error);
  } else {
    toast.error(res.error);
  }
}

export interface ProfileRankEditorProps {
  /** 계정 표시 정보 초기값 (인프라 전: { display_name: '', timezone: 'Asia/Seoul' }). */
  initialProfile: ProfileUpdate;
  /** 트랙별 랭크 초기값 (인프라 전: {} — 미설정). */
  initialRanks: Partial<Record<RankTrack, UserRankUpsert>>;
}

export function ProfileRankEditor({ initialProfile, initialRanks }: ProfileRankEditorProps) {
  return (
    <div className="flex flex-col gap-5">
      <AccountInfoSection initial={initialProfile} />

      <div className="flex flex-col gap-2">
        <h2 className="text-heading-xs text-[var(--text-strong)]">종목별 랭크</h2>
        <p className="text-body-xs-400 text-[var(--text-muted)]">
          주짓수는 벨트·스트라이프, 그 외 종목은 레벨로 관리합니다.
        </p>
        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {RANK_TRACKS.map((track) => (
            <RankTrackCard key={track} track={track} initial={initialRanks[track]} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 계정 표시 정보 (F1-AC3) — 표시명 + 타임존
 * ────────────────────────────────────────────────────────────────────────── */
function AccountInfoSection({ initial }: { initial: ProfileUpdate }) {
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [timezone, setTimezone] = useState(initial.timezone || DEFAULT_TIMEZONE);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await updateProfile({ display_name: displayName.trim(), timezone });
      notify(res);
    });
  }

  return (
    <CardSection title="계정 표시 정보" description="공유 시 보일 이름과 기준 시간대입니다.">
      <div className="flex flex-col gap-4">
        <Field label="표시명" htmlFor="profile-display-name">
          <input
            id="profile-display-name"
            type="text"
            value={displayName}
            maxLength={50}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="예: 홍길동"
            className={`h-10 placeholder:text-[var(--text-disabled)] ${FIELD_BASE}`}
          />
        </Field>

        <Field label="타임존" htmlFor="profile-timezone">
          <select
            id="profile-timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={`h-10 ${FIELD_BASE}`}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.id} value={tz.id}>
                {tz.label}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <Button variant="primary" size="md" disabled={pending} onClick={handleSave}>
            {pending ? '저장 중…' : '저장'}
          </Button>
        </div>
      </div>
    </CardSection>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 종목별 랭크 카드 (F1-AC4) — bjj=벨트+스트라이프(+라이브 미리보기), 비bjj=레벨
 * ────────────────────────────────────────────────────────────────────────── */
function RankTrackCard({ track, initial }: { track: RankTrack; initial?: UserRankUpsert }) {
  const isBjj = track === 'bjj';

  // bjj: 벨트/스트라이프 로컬 상태 (초기 미설정 → 흰띠·0). 비bjj: 레벨 문자열('' = 미설정).
  const [belt, setBelt] = useState<Belt>((initial?.belt as Belt | undefined) ?? 'white');
  const [stripes, setStripes] = useState<number>(initial?.stripes ?? 0);
  const [level, setLevel] = useState<string>(initial?.level ?? '');
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const payload: UserRankUpsert = isBjj
      ? { track, belt, stripes, level: null, visibility: 'private' }
      : { track, belt: null, stripes: null, level: level || null, visibility: 'private' };
    startTransition(async () => {
      const res = await upsertRank(payload);
      notify(res);
    });
  }

  const beltSelectId = `rank-${track}-belt`;
  const stripeSelectId = `rank-${track}-stripes`;
  const levelSelectId = `rank-${track}-level`;

  return (
    <div className="flex flex-col gap-3 rounded-m border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-button-m text-[var(--text-strong)]">{TRACK_LABELS[track]}</span>
        {/* 라이브 미리보기: bjj=BeltBadge, 비bjj=현재 레벨(미설정 포함). */}
        {isBjj ? (
          <BeltBadge belt={belt} stripes={stripes} size="sm" />
        ) : (
          <span className="text-body-xs-400 text-[var(--text-muted)]">{level || '미설정'}</span>
        )}
      </div>

      {isBjj ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="벨트" htmlFor={beltSelectId}>
            <select
              id={beltSelectId}
              value={belt}
              onChange={(e) => setBelt(e.target.value as Belt)}
              className={`h-10 ${FIELD_BASE}`}
            >
              {BELTS.map((b) => (
                <option key={b} value={b}>
                  {BELT_META[b].label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="스트라이프" htmlFor={stripeSelectId}>
            <select
              id={stripeSelectId}
              value={stripes}
              onChange={(e) => setStripes(Number(e.target.value))}
              className={`h-10 ${FIELD_BASE}`}
            >
              {STRIPE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : (
        <Field label="레벨" htmlFor={levelSelectId}>
          <select
            id={levelSelectId}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className={`h-10 ${FIELD_BASE}`}
          >
            {LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div>
        <Button variant="secondary" size="sm" disabled={pending} onClick={handleSave}>
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </div>
  );
}
