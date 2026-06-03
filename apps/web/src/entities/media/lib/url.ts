/**
 * 외부 링크 URL 안전화 (F5 external / Develop §5.6).
 *
 * 사용자가 붙인 임의 URL을 렌더하기 전에 스킴을 http/https로 한정한다(javascript:, data: 등 차단).
 * 개인 데이터를 새 탭 앵커로만 열고(서버에서 fetch하지 않음 — SSRF 무관) rel=noopener로 연다.
 * 도메인 화이트리스트는 두지 않는다(개인 참고 링크라 임의 도메인 허용; 안전은 스킴 한정 + noopener로 확보).
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** 표시용 호스트(없으면 null). */
export function urlHost(raw: string): string | null {
  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
}
