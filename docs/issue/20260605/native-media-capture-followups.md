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

### 1. HEIC 사진(iOS 기본 포맷) — ✅ 해결됨 (2026-06-05)
- **`expo-image-manipulator ~14.0.8`로 픽한 이미지를 무조건 JPEG로 재인코딩**(media-capture `normalizeImageToJpeg`).
  소스가 HEIC든 PNG든 항상 `image/jpeg`로 통일 → 웹 `<img>` 렌더·sign-upload(jpg/png/webp) 통과. 긴 변 >2048px면 리사이즈(용량 절감).
- 결정론적 수정이라 실기기 확인 불필요(정답은 코드). 실기기는 UX 확인용으로만.
- ↪ 잔여(LOW): 정규화 실패 시 원본 fallback(드물게 비-jpeg). expo-image-picker가 이미 jpeg를 줄 때 불필요한 재인코딩 1회(무해, 용량만 약간).

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

---

# E 트랙 #2 — 오프라인 재시도 업로드 큐 (2026-06-05, 같은 세션 이어서)

> 범위 **Fork A(세션 내 재시도)**. 네이티브 PUT이 네트워크로 실패하면 즉시 ERROR 대신
> 큐에 넣고 NetInfo 복귀/backoff로 재시도. 캡처 파일은 documentDirectory로 복사(캐시 eviction 대비).
> 신규 `apps/mobile/hooks/webview/upload-queue.ts`, `media-capture.handleUploadTicket`이 위임.

## 이번 세션 수정 완료
- 🔴 **교차 경계 타임아웃 불변식** — 픽 소요가 웹 타임아웃엔 포함되나 네이티브 예산엔 미포함 → 픽이 길면 고아 재발. **수정: 티켓 핸드오프 시점에 웹 `CAPTURE_TIMEOUT_MS`(6분) 재시작**(업로드 윈도우를 픽 시간과 분리). 네이티브 예산 `TICKET_BUDGET_MS`=4분 < 6분 < 서명URL TTL 10분. 회귀 테스트 추가(픽 5분+DONE 누적 10분도 resolve).
- 🟠 `enqueueUpload` 중복 호출 가드(기존 복사본/타이머 정리) + 파일명에 nonce(충돌·지연 delete 레이스 차단).
- 🟡 `attemptSoon` 타이머 정리를 inFlight 체크 **전에**(방어적 누수 차단).

## 보류
- **ACK 핸드셰이크(#5/#6)**: 네이티브가 티켓 수신 시 `MEDIA_TICKET_RECEIVED` 회신 → 웹이 정확한 업로드 시작 시각 기준으로 타임아웃 관리. 현재는 "티켓 송신 시 재시작 + 2분 마진"으로 완화(충분). 정밀 관측/엣지 강화가 필요하면 후속.
- **고아 reconciliation(선택)**: 그래도 남는 극단 케이스(업로드 성공했는데 행 미생성) 대비, storage에 있으나 media_assets 행 없는 객체를 주기 청소하는 백그라운드 잡(P2).

## 디바이스 검증 필수 (오프라인 큐)
- NetInfo online 이벤트 → 실제 재시도 트리거.
- `documentDirectory` 복사/삭제 수명(성공·실패·예산소진 모두 정리되는지).
- 오프라인 지속 시 4분 예산 후 ERROR 안내가 웹에 정확히 도달(웹 6분 전).
- 대용량(≤100MB) PUT가 backoff 재시도와 예산 내 완료되는지.

---

## 검증/게이트 (2026-06-05)
- web: tsc·lint·**vitest 1122**·build(AUTH-OFF static 14/14) green.
- mobile: tsc·lint green(기존 webview-screen warning 2건 무관).
- 적대적 리뷰: 8확정 중 6수정, 2(HEIC·토큰)는 위 보류.

## 배포 메모
- **DB 마이그레이션 불필요** — 이미지는 기존 `media_assets.kind='upload'`로 수용(MIME 제약 없음), `videos/`↔`images/` 경로 세그먼트로 표시 구분([[isImageStoragePath]]). 0020 만들지 않음.
- 모바일 신규 의존성 `expo-image-picker ~17.0.10`(설치됨), `expo-file-system ~19.0.21`(기설치). EAS 빌드 시 네이티브 권한 재생성 필요.
- E-AUTH와 동일하게 `feat/stats-dashboard-calendar-views`에만 — main 미배포.
