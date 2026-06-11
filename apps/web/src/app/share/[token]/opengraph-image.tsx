import { ImageResponse } from 'next/og';

import { fetchSharedResourceForOg } from './share-og';

/**
 * `/share/[token]` OG 이미지 (1200×630) — 카톡/메신저 미리보기 카드용 브랜드 이미지.
 *
 * ⚠ satori 기본 폰트는 한글 글리프가 없어(tofu) **이미지 안 텍스트는 숫자·영문·이모지만** 쓴다 —
 * 한글 정보(제목/설명)는 generateMetadata의 og:title/description이 담당한다(카톡이 텍스트로 렌더).
 * 한글 폰트 로딩(서브셋 fetch)은 지연·복잡도 대비 이득이 없어 의도적으로 안 한다.
 *
 * 내용물: 세션 = 훈련 날짜(YYYY.MM.DD) / 기술 = 'TECHNIQUE' 라벨. 무효 토큰 = 브랜드만(존재 누설 없음).
 */

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'MatLog 훈련 기록 공유';

export default async function OgImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const envelope = await fetchSharedResourceForOg(token);

  let kicker = 'SHARED LOG';
  let headline = 'MatLog';
  if (envelope?.data) {
    if (envelope.type === 'session') {
      kicker = 'TRAINING SESSION';
      headline = envelope.data.trained_on.replaceAll('-', '.');
    } else {
      kicker = 'TECHNIQUE NOTE';
      headline = envelope.data.category.replace(/_/g, ' ').toUpperCase();
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0b0b0e',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        {/* 상단 — 킥커 + 액센트 바 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', width: 120, height: 10, backgroundColor: '#e11d48' }} />
          <div style={{ display: 'flex', fontSize: 36, letterSpacing: 10, color: '#a1a1aa' }}>
            {kicker}
          </div>
        </div>

        {/* 중앙 — 핵심 한 줄(날짜/카테고리) */}
        <div
          style={{
            display: 'flex',
            fontSize: 150,
            fontWeight: 700,
            color: '#fafafa',
            letterSpacing: -2,
          }}
        >
          {headline}
        </div>

        {/* 하단 — 브랜드 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 56, color: '#fafafa' }}>
            <span>🥋</span>
            <span style={{ fontWeight: 700 }}>MatLog</span>
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: '#71717a' }}>mma-record-web.vercel.app</div>
        </div>
      </div>
    ),
    size,
  );
}
