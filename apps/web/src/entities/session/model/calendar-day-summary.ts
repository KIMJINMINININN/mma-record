import { z } from 'zod';
import { DISCIPLINES } from '@/shared/model/enums';

/**
 * 캘린더 일별 요약 — `calendar_day_summary` 뷰와 1:1 (Develop §4.5).
 * 한 행 = 하루. 월간 그리드 셀이 종목 점 + 세션 수를 그릴 때의 데이터 소스.
 * (PRD F2 / Design §7a / §8)
 *
 * NOTE: 뷰는 세션이 있는 날짜만 행을 갖는다 → 키 부재 = 빈 날(셀에 점/숫자 없음).
 */

/** 'YYYY-MM-DD' (DB `date`, KST 날짜) — session 모델의 DATE_REGEX와 동일 규칙. */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const calendarDaySummarySchema = z.object({
  /** 캘린더 그리드 키 (KST 날짜) */
  trained_on: z.string().regex(DATE_REGEX, 'YYYY-MM-DD 형식이어야 합니다'),
  /** 그 날의 세션 수 (셀 우측 배지 숫자, 색약 보강) */
  session_count: z.number().int().min(0),
  /** 그 날 등장한 종목 목록 (중복 제거된 점 색의 소스) */
  disciplines: z.array(z.enum(DISCIPLINES)),
  /** 미디어(영상/유튜브) 포함 여부 — 셀 보조 인디케이터(P1) */
  has_media: z.boolean(),
});
export type CalendarDaySummary = z.infer<typeof calendarDaySummarySchema>;

/**
 * 월간 그리드용 조회 결과 형태 — 날짜('YYYY-MM-DD')를 키로 한 맵.
 * CalendarMonthGrid 가 `tileContent`에서 O(1)로 셀별 요약을 찾기 위해 사용.
 */
export type CalendarDaySummaryMap = Record<string, CalendarDaySummary>;
