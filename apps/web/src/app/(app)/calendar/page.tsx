import { CalendarScreen } from './calendar-screen';

/**
 * 캘린더 홈 (F2 / Design §7a·§7b·§8) — 얇은 서버 컴포넌트.
 *
 * 상태/날짜/인터랙션은 클라이언트 아일랜드(CalendarScreen)가 소유한다.
 * 딥링크 `?date=YYYY-MM-DD`(검색/역참조 세션 결과 진입)를 여기서 읽어 형식 검증 후 초기값으로 내린다.
 * (app) 그룹은 점등 후 인증 가드(getUser)로 이미 동적(ƒ)이라 searchParams 읽기에 추가 비용 없음.
 * `key`로 date 변경 시 CalendarScreen을 remount해 같은 라우트 내 파라미터 변경도 초기값에 반영한다.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const { date } = await searchParams;
  const raw = Array.isArray(date) ? date[0] : date;
  // 우리 resultHref가 만드는 형식만 수용(YYYY-MM-DD). 그 외/부재는 null(=오늘).
  const initialDateISO = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;

  return <CalendarScreen key={initialDateISO ?? 'today'} initialDateISO={initialDateISO} />;
}
