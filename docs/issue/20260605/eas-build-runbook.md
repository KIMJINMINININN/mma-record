# 모바일 EAS 빌드 + 디바이스 검증 런북 (2026-06-05)

> 목표: #1 촬영/갤러리 · #2 오프라인 큐 · HEIC · 프리뷰 · E-AUTH를 **실기기에서 동작 확인**.
> prep 완료(이 커밋): `config/env.ts` CLIENT_URL=`https://mma-record-web.vercel.app`, `eas.json`(preview=android apk, env=production).
> **빌드는 이 브랜치(feat/stats-dashboard-calendar-views) 체크아웃에서** 진행(env.ts·eas.json이 여기 있음).

## A. Android preview 빌드 (가장 쉬움 — Google Play 불필요)
```bash
npm i -g eas-cli                 # 또는 npx eas-cli@latest 사용
cd apps/mobile
eas login                        # Expo 계정(무료, expo.dev 가입). 없으면 먼저 가입
eas build -p android --profile preview
```
- **첫 실행 시**: "create EAS project?" → **Yes** → app.json에 `extra.eas.projectId` 자동 추가(커밋해두면 좋음). Android keystore도 EAS가 자동 생성(관리형) — 별도 자격 불필요.
- 빌드는 Expo 클라우드에서 ~10–20분 → 완료되면 **apk 다운로드 링크/QR** 제공.
- 안드로이드 폰에 apk 설치("출처를 알 수 없는 앱 설치" 허용).

## B. 디바이스 테스트 체크리스트
앱 실행 → MatLog(prod) 로드 → **실계정 로그인**.
- [ ] **로그인** 성공(WebView 안). → E-AUTH: 네이티브가 토큰 보관(콜드스타트 복원은 followup).
- [ ] 세션/기술 편집 → **📷 촬영** → 영상 녹화 → 업로드 → 미디어 행 표시·재생.
- [ ] **🖼 갤러리** → 사진 선택 → 업로드 → 카드에 이미지 표시(HEIC면 JPEG로 변환돼 표시되는지).
- [ ] picker에 **프리뷰 썸네일**(placeholder 아님) 보이는지.
- [ ] **비행기모드**로 캡처/저장 시도 → 다시 켜면 자동 업로드 완료(오프라인 큐, 4분 내). 4분 초과 시 에러 안내.
- [ ] 권한 거부 시 안내. 대용량(≤100MB) 영상.
- 콘솔/네트워크는 `eas build`에 `--profile development`(dev client)면 디버깅 쉬움.

## C. iOS (선택, 나중)
- Apple Developer($99/년) + 기기 등록 또는 TestFlight 필요.
- `eas build -p ios --profile preview` (credentials EAS 관리). HEIC는 iOS에서 진짜 테스트 가능(아이폰 기본 포맷).

## 메모
- 신규 네이티브 의존성(expo-image-picker·file-system·image-manipulator·video-thumbnails) + app.json `expo-image-picker` 권한 플러그인은 EAS prebuild가 자동 반영.
- 빌드 후 app.json에 생긴 `extra.eas.projectId`는 커밋 권장(다음 빌드 재사용).
- 문제 발견 시 → `docs/issue/20260605/native-media-capture-followups.md`에 추가.
