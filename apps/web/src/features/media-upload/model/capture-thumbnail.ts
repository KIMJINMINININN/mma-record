/**
 * 업로드 영상 첫프레임 캡처 (F5-AC5 / Develop §5.5 — MVP: 클라 <video>+<canvas>).
 *
 * 선택한 영상 파일의 첫 프레임 근처(0.1s)를 canvas로 그려 JPEG Blob으로 반환한다.
 * 브라우저 전용 — SSR/실패/타임아웃 시 null 반환(호출부는 썸네일 없이 진행, graceful degrade).
 * 소스는 로컬 object-URL(same-origin/blob)이라 canvas tainting 없음.
 *
 * 견고성: seek 목표가 현재 위치와 같으면 'seeked'가 안 올 수 있어, loadeddata 후 짧은 폴백 타이머로도
 * 그린다(어느 쪽이든 먼저 오면 1회). 그래도 안 되면 하드 5s 타임아웃으로 null.
 */
export async function captureFirstFrame(file: File): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<Blob | null>((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      let settled = false;
      const finish = (blob: Blob | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(hardTimer);
        video.removeAttribute('src');
        video.load();
        resolve(blob);
      };

      let drawn = false;
      const draw = () => {
        if (drawn || settled) return;
        drawn = true;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 180;
          const ctx = canvas.getContext('2d');
          if (!ctx) return finish(null);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.8);
        } catch {
          finish(null);
        }
      };

      // 디코딩이 늦거나 이벤트가 전혀 안 오면 무한 대기 방지.
      const hardTimer = setTimeout(() => finish(null), 5000);

      video.onerror = () => finish(null);
      video.onloadeddata = () => {
        try {
          video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
        } catch {
          /* seek 불가 — 폴백 타이머가 현재 프레임을 그린다. */
        }
        // seeked가 안 와도 디코딩된 첫 프레임을 그린다.
        setTimeout(draw, 800);
      };
      video.onseeked = draw;

      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
