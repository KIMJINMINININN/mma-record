# 네이티브 촬영/갤러리 미디어 브릿지 — followup (2026-06-05)

> E 트랙 #1. 브랜치 `feat/stats-dashboard-calendar-views`. 적대적 리뷰(4렌즈→검증, 23발견/8확정) 결과 중
> **이번 세션에서 수정한 6건은 코드 반영 완료**, 아래는 **의도적 보류 / 디바이스 검증 대기 / LOW** 항목.

## 이번 세션에 수정 완료 (참고)
- 🔴 **타임아웃 레이스 → 고아 업로드** (`native-bridge.onPicked`): fetch 대기 중 5분 타임아웃 발동 시 TICKET 미송신 가드(`pending.has`) + 회귀 테스트.
- 🟠 모바일 `mediaTypes` 무시 → 웹 요청 값 매핑(`'image'→'images'`).
- 🟡 MediaPicker stale closure → `valueRef`(최신 커밋 value) 기준 append(파일/네이티브 양 경로).
- 🟡 persist 이미지 `duration_sec` null 강제(앱 레이어 불변식).
- 🟡 모바일 `MEDIA_UPLOAD_TICKET` `mime` 필수 검증.
- 🟡 모바일 `pendingPicks` TTL(10분) — 티켓 미도착 누수 방지 + iOS `.mov` mime 파일명 추론.

## 보류 / 디바이스 검증 대기

### 1. HEIC 사진(iOS 기본 포맷) 미지원 — ⚠ 제품 확인 필요
- 현재 허용: `image/jpeg|png|webp`. iPhone 기본 촬영은 **HEIC** → `validatePicked`에서 거부("jpg·png·webp 사진만").
- 옵션: (a) 네이티브에서 JPEG 재인코딩(expo-image-picker 옵션/별도 transcode), (b) 백엔드 HEIC 허용 + 서버 변환(웹 `<img>`는 HEIC 못 그림 → 변환 필수, 큼), (c) 현 제약 유지 + 사용자 안내.
- **권장**: 디바이스에서 expo-image-picker가 실제 무엇을 반환하는지 먼저 확인(quality 옵션 시 JPEG 변환되는 기기 있음). 그 후 (a) 검토.

### 2. 서명 URL 토큰이 postMessage로 네이티브에 전달 — 보안 가정 문서화
- `MEDIA_UPLOAD_TICKET.uploadUrl`에 Supabase 업로드 토큰(단명·PUT 전용·(user_id,path) 한정)이 포함.
- **요구사항**: 네이티브측 로깅/크래시리포트(Sentry 등)가 **postMessage 페이로드를 절대 캡처하지 않도록** 필터링. (코드 주석으로 플래그됨)
- 강화 옵션(후속): 사용 직전 일회용 토큰 발급 엔드포인트(왕복 1회 추가) / 토큰 회전.

### 3. 디바이스 검증 필수 (헤드리스로 확인 불가)
- expo-image-picker v17 촬영/갤러리 실제 동작(권한 다이얼로그·취소·asset 필드값).
- `expo-file-system/legacy uploadAsync(BINARY_CONTENT, PUT)` → Supabase 서명 URL 실제 업로드 성공/Content-Type 저장 확인.
- app.json `expo-image-picker` 플러그인이 prebuild/EAS에서 iOS `NSCamera/NSPhotoLibrary/NSMicrophone`·Android 권한을 실제 주입하는지 확인(미주입 시 `ios.infoPlist`/권한 수동 추가).
- 대용량(≤100MB) 영상 PUT 중 서명 URL TTL(10분) 내 완료 여부 — 초과 시 재서명/재시도(현재 없음).
- 카메라 영상 화질이 60s에 100MB 초과 가능 → 웹 검증이 거부. 필요 시 네이티브 압축.

### 4. LOW / nit (여유 시)
- `WebViewMediaBridge` origin 검사 부재(현재 WebView 게이트 + 네이티브 originWhitelist로 안전, 주석화됨).
- 모바일 `sizeBytes` fallback 0 — getInfoAsync 실패 시 0(웹/서버 검증이 거름). 명시 안내 검토.
- `MEDIA_PICK_REQUEST` 모바일 핸들러 필드 검증을 `mediaTypes/limits`까지 확장.
- 네이티브 캡처 미디어 **프리뷰 썸네일** 부재(picker 그리드는 "내 사진/영상" placeholder). 작은 base64 썸네일을 MEDIA_PICKED에 실어 프리뷰(브릿지 부담 작음) — UX 개선.
- 네이티브 업로드 영상 **첫프레임 썸네일** 미생성(`thumbnail_path=null`). `expo-video-thumbnails`로 생성 후 별도 티켓 업로드 검토.
- 동시 캡처(촬영+갤러리 연타) 시 valueRef로 유실은 막았으나, 한 번에 하나 UX 가정.

## 검증/게이트 (2026-06-05)
- web: tsc·lint·**vitest 1122**·build(AUTH-OFF static 14/14) green.
- mobile: tsc·lint green(기존 webview-screen warning 2건 무관).
- 적대적 리뷰: 8확정 중 6수정, 2(HEIC·토큰)는 위 보류.

## 배포 메모
- **DB 마이그레이션 불필요** — 이미지는 기존 `media_assets.kind='upload'`로 수용(MIME 제약 없음), `videos/`↔`images/` 경로 세그먼트로 표시 구분([[isImageStoragePath]]). 0020 만들지 않음.
- 모바일 신규 의존성 `expo-image-picker ~17.0.10`(설치됨), `expo-file-system ~19.0.21`(기설치). EAS 빌드 시 네이티브 권한 재생성 필요.
- E-AUTH와 동일하게 `feat/stats-dashboard-calendar-views`에만 — main 미배포.
