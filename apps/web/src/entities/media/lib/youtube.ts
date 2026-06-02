/**
 * YouTube URL/ID 유틸 — 외부 의존성 없이 정규식/URL 파싱으로.
 * PRD/Develop §7: URL 원문은 저장하지 않고 정규화된 videoId 만 보관한다.
 */

/** YouTube videoId 형태: 정확히 11자 [A-Za-z0-9_-] */
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** 호스트(서브도메인 포함)가 youtube 계열인지 판정 */
function isYoutubeHost(hostname: string): boolean {
  // 'www.youtube.com.' 같은 끝점(FQDN) 표기를 정규화해 false negative 방지
  const h = hostname.toLowerCase().replace(/\.$/, '');
  // www / m / music 등 서브도메인 허용 + youtube.com / youtu.be
  return (
    h === 'youtu.be' ||
    h === 'youtube.com' ||
    h.endsWith('.youtube.com')
  );
}

/** 후보 문자열이 유효한 11자 videoId 면 그대로, 아니면 null */
function asValidId(candidate: string | null | undefined): string | null {
  if (candidate && YOUTUBE_ID_RE.test(candidate)) return candidate;
  return null;
}

/**
 * 다양한 YouTube URL/ID 입력에서 11자 videoId 를 추출한다.
 *
 * 지원 입력:
 *  - https://www.youtube.com/watch?v=ID (&t=.., &list=.. 등 부가 쿼리 무시)
 *  - https://youtu.be/ID?t=..              (단축 링크)
 *  - https://www.youtube.com/embed/ID
 *  - https://www.youtube.com/shorts/ID
 *  - https://www.youtube.com/v/ID, /live/ID
 *  - https://www.youtube.com/attribution_link?u=/watch?v=ID (레거시, 중첩 u= 파라미터)
 *  - https://m.youtube.com/...             (모바일 호스트)
 *  - http/https/프로토콜 생략, www 유무 모두
 *  - 11자 videoId 만 입력되면 그대로 반환
 *
 * 정책 메모:
 *  - 경로 세그먼트 비교는 모두 소문자 정규화 → watch/embed/shorts/v/live 패밀리가
 *    대소문자에 동일하게 동작(WATCH·EMBED 등 비표준 표기는 일관되게 거부).
 *  - watch?v= 가 아닌 임의 경로의 top-level v= 는 신뢰하지 않는다(/feed?v=, /results?v= 거부).
 *    레거시 attribution_link 만 중첩 u= 안의 v= 를 한정적으로 허용한다.
 *  - 프로토콜 생략 입력은 https 로 보강하므로 '//youtu.be/ID' 같은 protocol-relative 도 허용된다(의도된 관용).
 *
 * 매칭 실패/유효하지 않은 호스트·ID 길이/빈 문자열 → null.
 */
export function parseYoutubeVideoId(input: string): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed === '') return null;

  // 케이스 1: 순수 11자 videoId 직접 입력 (URL 이 아님)
  const directId = asValidId(trimmed);
  if (directId) return directId;

  // 프로토콜이 없으면 URL 파서가 인식하도록 보강 ('youtu.be/ID', 'www.youtube.com/..' 등)
  // '//youtu.be/ID' 형태의 protocol-relative 입력도 https 로 보강해 허용한다(의도된 관용).
  const withProtocol = /^[a-z]+:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/\//, '')}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    // 케이스: URL 로 파싱 불가 → null
    return null;
  }

  // 케이스: youtube 계열 호스트가 아님 → null (잘못된 호스트)
  if (!isYoutubeHost(url.hostname)) return null;

  // 끝점(FQDN) 표기를 정규화해 youtu.be 단축 호스트 판정도 일관되게
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  // 선행 슬래시 제거 후 path 세그먼트 분리, 첫 세그먼트는 대소문자 정규화
  const segments = url.pathname.split('/').filter(Boolean);
  const head = (segments[0] ?? '').toLowerCase();

  // 케이스 2: youtu.be/ID (?t=.. 부가 쿼리 무시)
  if (host === 'youtu.be') {
    return asValidId(segments[0]);
  }

  // 케이스 3: youtube.com/watch?v=ID (&t / &list 등 무시)
  if (head === 'watch') {
    return asValidId(url.searchParams.get('v'));
  }

  // 케이스 4/5: /embed/ID, /shorts/ID, /v/ID, /live/ID — 두 번째 세그먼트가 ID
  if (head === 'embed' || head === 'shorts' || head === 'v' || head === 'live') {
    return asValidId(segments[1]);
  }

  // 케이스 6: 레거시 /attribution_link?u=/watch?v=ID — 중첩 u= 안의 v= 만 한정 허용.
  // (임의 경로의 top-level v= 는 신뢰하지 않으므로 blanket 폴백은 제거함)
  if (head === 'attribution_link') {
    const u = url.searchParams.get('u');
    if (u) {
      try {
        const nested = new URL(u, 'https://www.youtube.com');
        const nestedHead = (nested.pathname.split('/').filter(Boolean)[0] ?? '').toLowerCase();
        if (nestedHead === 'watch') {
          return asValidId(nested.searchParams.get('v'));
        }
      } catch {
        // 중첩 u= 파싱 실패 → null 로 흘러감
      }
    }
  }

  // 그 외 매칭 실패
  return null;
}

/**
 * videoId 가 유효한 11자 형태인지 검증한다(파서와 동일한 단일 출처 YOUTUBE_ID_RE 공유).
 * builder 호출부에서 빈 문자열·경로 주입('../../evil') 등을 사전 차단하기 위함.
 */
function assertValidVideoId(videoId: string): string {
  if (typeof videoId !== 'string' || !YOUTUBE_ID_RE.test(videoId)) {
    throw new Error(`Invalid YouTube videoId: ${JSON.stringify(videoId)}`);
  }
  return videoId;
}

/**
 * videoId 로 표준 embed URL 생성 → 'https://www.youtube.com/embed/<id>'.
 * 11자 정규식 검증 실패 시 throw, 통과 후에도 encodeURIComponent 로 안전하게 인코딩.
 */
export function buildYoutubeEmbedUrl(videoId: string): string {
  const id = assertValidVideoId(videoId);
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
}

/**
 * videoId 로 썸네일 URL 생성.
 * quality 기본값 'hq' (hqdefault.jpg). img.youtube.com 사용.
 * 11자 정규식 검증 실패 시 throw, 통과 후에도 encodeURIComponent 로 안전하게 인코딩.
 */
export function buildYoutubeThumbnailUrl(
  videoId: string,
  quality: 'default' | 'hq' | 'mq' | 'sd' | 'maxres' = 'hq',
): string {
  const id = assertValidVideoId(videoId);
  // quality → YouTube 썸네일 파일명 매핑
  const fileMap: Record<typeof quality, string> = {
    default: 'default',
    hq: 'hqdefault',
    mq: 'mqdefault',
    sd: 'sddefault',
    maxres: 'maxresdefault',
  };
  return `https://img.youtube.com/vi/${encodeURIComponent(id)}/${fileMap[quality]}.jpg`;
}
