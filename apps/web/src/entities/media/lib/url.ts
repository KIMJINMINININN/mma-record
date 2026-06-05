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

/**
 * 업로드 자산(kind='upload')의 storage_path가 사진인가 — `images/` 세그먼트로 판별 (E 트랙).
 * 영상은 `videos/`, 사진은 `images/` 경로로 발급되므로 별도 mime 컬럼 없이 표시에서 구분한다
 * (sign-upload 라우트가 경로를 강제 — `<user_id>/{videos|images}/<uuid>.<ext>`).
 */
export function isImageStoragePath(path: string | null | undefined): boolean {
  return !!path && path.includes('/images/');
}

/** 표시용 호스트(없으면 null). */
export function urlHost(raw: string): string | null {
  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
}

/**
 * 도메인 식별 아바타 — 첫 글자 + host 해시 hue(0~359) + 표시용 도메인(www. 제거).
 * 외부 서비스/키 없이 순수 계산이라(favicon 스크래핑·OG fetch 회피) 클라에서 즉시 동작한다.
 * 진짜 OG 메타(자동 제목/이미지)는 서버 fetch가 필요해 별도 트랙 — 이건 그 경량 대체(F5 external).
 */
export function domainAvatar(host: string): { letter: string; hue: number; label: string } {
  const label = host.replace(/^www\./, '');
  const letter = (label[0] ?? '?').toUpperCase();
  // 결정적 해시(곱셈 31) → hue. Date/Math.random 미사용(순수·SSR 안전).
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) hash = (hash * 31 + label.charCodeAt(i)) % 360;
  return { letter, hue: hash, label };
}
