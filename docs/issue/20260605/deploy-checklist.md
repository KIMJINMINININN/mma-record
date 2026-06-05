# 배포 체크리스트 (2026-06-05) — E-AUTH + E트랙 #1/#2 + HEIC

> **`main` 푸시 완료**: `6002e4f → 571ad7e` (fast-forward). origin/main 반영 → Vercel prod 자동 배포 트리거.
> 포함: E-AUTH 인증 브릿지(9e19b5c) · 네이티브 촬영/갤러리(#1) · 오프라인 재시도 큐(#2) · HEIC→JPEG 정규화.
> **DB 마이그레이션 추가 없음** — 이미지는 기존 `media_assets.kind='upload'` 수용(경로로 구분). db:push 불필요.

## 1. 웹 (Vercel) — 사장님 확인
- [ ] **Vercel 대시보드에서 빌드 성공 확인** (CLI 미설치 → 대시보드). 배포 커밋 `571ad7e`.
- [ ] prod 도메인 스모크: 로그인 → 캘린더/기술/검색 정상 로드(기존 기능 회귀 없음).
- [ ] **웹 변경은 일반 브라우저에서 inert**라 회귀 위험 낮음:
  - WebViewMediaBridge: `window.ReactNativeWebView` 없으면 no-op.
  - MediaPicker: 브라우저에선 기존 `📹 파일` 버튼 그대로(촬영/갤러리 버튼 미표시).
  - UploadMedia: 기존 업로드 영상 행은 이전과 동일 렌더(이미지 행 아직 0건).
  - sign-upload `kind='image'`: 네이티브 경로에서만 도달(기존 video/thumbnail 불변).
- [ ] (이월) prod §6 시각 검증: 벨트 패싯·기술 level·즐겨찾기 별표·실데이터 화면(0017/0018/0019).

## 2. 모바일 (EAS) — 사장님, 별도 빌드 필요 ⚠
> Vercel은 웹만 배포한다. 네이티브 브릿지(#1/#2/E-AUTH/HEIC)는 **EAS 빌드**를 새로 만들어야 디바이스에서 동작.
- [ ] **`apps/mobile/config/env.ts`의 CLIENT_URL을 실 prod Vercel 도메인으로** (현재 `example.com` placeholder). 또는 `EXPO_PUBLIC_CLIENT_URL` 오버라이드.
- [ ] EAS 빌드(`eas build`) — **신규 네이티브 의존성 포함 재빌드 필수**: `expo-image-picker`·`expo-file-system`·`expo-image-manipulator` + app.json `expo-image-picker` 플러그인(카메라/사진/마이크 권한).
- [ ] iOS Info.plist에 `NSCameraUsageDescription`·`NSPhotoLibraryUsageDescription`·`NSMicrophoneUsageDescription` 주입 확인(플러그인이 prebuild에서 넣음 — 누락 시 app.json `ios.infoPlist`로 수동).
- [ ] Supabase Auth: site_url/redirect에 prod 도메인 포함(E-AUTH 핸드오프용, 이미 돼 있으면 skip).

## 3. 디바이스 실동작 검증 (EAS 빌드 후) — 사장님/QA
- [ ] **E-AUTH**: 웹 로그인 → 네이티브 SecureStore 토큰 보관(콜드스타트 복원은 followup).
- [ ] **#1 촬영/갤러리**: 세션/기술 편집에서 `📷 촬영`·`🖼 갤러리` → picker → 업로드 → 미디어 행 생성·표시.
  - 사진(HEIC 포함) → JPEG로 업로드·렌더 확인. 영상(mp4/mov) → 재생 확인.
- [ ] **#2 오프라인 재시도**: 비행기모드로 캡처 → 온라인 복귀 시 자동 업로드 완료(4분 예산 내). 4분 초과 시 에러 안내.
- [ ] 권한 거부 시 안내 동작. 대용량(≤100MB) 영상 PUT.

## 메모
- 롤백: 문제 시 `git revert` 또는 Vercel 대시보드에서 이전 배포로 promote.
- 모바일 코드는 main에 들어가 있으나 EAS 빌드 전까진 기존 앱에 영향 없음(스토어 배포는 별도).
- 상세 followup: `docs/issue/20260605/native-media-capture-followups.md`.
