# LOODI iOS 앱

기존 React 화면을 Capacitor 8 iOS 앱 안에 정적으로 포함한다. 원격 웹사이트를 여는 server.url 방식은 사용하지 않는다. Next.js 서버의 AI·문의·계정 삭제 API와 Supabase 인증은 인터넷 연결이 필요하다. 웹 빌드는 기존대로 유지된다.

이 구조는 WKWebView를 사용하는 하이브리드 앱이다. SwiftUI 또는 React Native로 화면을 다시 작성한 구조는 아니다. 정적 파일 생성과 `cap sync` 성공을 네이티브 실행 또는 출시 준비 완료로 해석하지 않는다.

## 앱 번들 글꼴과 표시 검증

- Pretendard 1.3.9 가변 글꼴과 OFL 라이선스를 `public/fonts`에 포함한다. 외부 CDN 요청 없이 한국어 글꼴을 로드하며, iOS 앱의 `public/fonts`에도 복사된다.
- 한글 단어 단위 줄바꿈, 긴 문자열의 컨테이너 내 줄바꿈, Safari 자동 글자 크기 보정, 여러 줄 버튼의 최소 높이를 설정한다. 사용자 확대 기능은 차단하지 않는다.
- `npm run mobile:preview`는 `mobile/dist`만 UTF-8로 제공한다. 실제 앱 플러그인·안전 영역·키보드 테스트를 대체하지 않는다.
- `npm run test:mobile -- --project=ios-webkit --project=ios-webkit-small`로 앱 번들의 WebKit 화면 흐름과 글꼴 로딩을 검증한다. 2026-10-30 현재 머신에서는 설치된 WebKit이 시작 시 Bus error로 종료되어 검증하지 못했다.
- Chromium 대체 검증: `npm run test:mobile -- --project=bundle-chromium --project=bundle-chromium-small`. 두 크기에서 가입·로그인·기록 흐름 및 로컬 글꼴 로딩/주요 제목·메뉴의 글자 영역 검증 6개 통과. 외부 인증·AI는 모의 응답이다. iOS에서 사용자가 보고한 깨짐의 재현·해결 확인은 아직 남아 있다.

## 실행

1. Xcode 26 이상과 iOS SDK 설치. 현재 개발 머신의 Xcode 15.4로는 최신 Capacitor 8 빌드를 검증할 수 없다.
2. `.env.local`에 `NEXT_PUBLIC_API_ORIGIN=https://실제서버도메인` 설정. 경로 없는 HTTPS origin이어야 한다. Supabase 공개 URL/anon key도 설정한다.
3. 서버 배포 환경에 `GEMINI_API_KEY`, Supabase 설정, `SUPABASE_SERVICE_ROLE_KEY`, Redis REST 설정([보안 수정 기록](security-refactoring.md)) 후 이 변경사항을 배포한다. 서비스 역할 키는 앱에 포함하지 않는다.
4. `npm run ios:sync` → `npm run ios:open`.
5. Xcode의 App 타깃 Signing & Capabilities에서 Apple Developer Team 및 소유한 Bundle ID 설정. 현재 `com.loodi.app`은 임시 식별자이므로 capacitor.config.ts와 Xcode에서 함께 변경한다.
6. 실제 iPhone에서 이메일 가입/로그인, 촬영·사진 선택, 분석, 저장·재시작, 공유 취소, 계정 삭제, 오프라인 상태를 확인한다.
7. Product → Archive → Distribute App → App Store Connect에서 TestFlight 검증 후 심사 제출.

`mobile:build`는 `.mobile-build`에 별도 복사한 앱에서 서버 라우트를 제외해 정적 export한다. 원본 API 파일을 이동하거나 삭제하지 않는다. 결과는 `mobile/dist`에 생성된다. `ios:sync`는 재빌드하고 네이티브 프로젝트에 복사한다. 환경변수 변경 후 반드시 다시 실행한다.

개발 중 `https://example.com`으로 정적 빌드 구조만 검증했다. 이는 실제 API가 아니므로 기기 실행 전 실제 서버 origin으로 다시 빌드해야 한다. 빌드·동기화 성공은 실제 API 연결이나 네이티브 실행 검증을 의미하지 않는다.

## 현재 동작

- 기기 내 화면과 기존 사용자별 로컬 착장 기록
- Record의 네이티브 카메라, iOS 공유 시트, 안전 영역과 오프라인 표시
- 이메일/비밀번호 인증. 앱 빌드에서 Google 로그인 진입은 숨긴다. 브라우저 인증은 그대로 유지한다. 추후 소셜 로그인 추가 시 외부 인증 세션·콜백 및 Apple 로그인 요건을 구현한다.
- Closet → 프로필 관리에서 계정 영구 삭제. 검증된 사용자 토큰으로 서버가 Supabase Auth 사용자와 메타데이터를 삭제하고 현재 기기 기록을 정리한다. 다른 기기의 로컬 기록은 원격 삭제할 수 없다. 향후 DB/Storage에 사용자 데이터를 저장하면 해당 데이터 삭제도 구현해야 한다.
- AI 전송 전 Google Gemini로의 사진/기록 제공 동의를 받는다.
- AI API는 초대 목록이 비어 있어도 로그인 토큰을 검증하고 Redis 기반 사용자별/전체 사용량 제한을 적용한다. 서버에 Redis REST 설정이 필요하다.

## 출시 전에 완료할 항목

- 운영자 정보, 연락처, 수집 항목, Gemini 제공, 보관·삭제 정책을 확정한 공개 개인정보처리방침과 앱 내 링크. 현재 정책 페이지는 작성되지 않았다.
- App Store Connect 개인정보 공개 내용과 SDK privacy manifest 검토. `ITSAppUsesNonExemptEncryption=false`는 현재 표준 HTTPS 사용 기준이므로 암호화 기능을 추가하면 다시 검토.
- 정식 아이콘, 스플래시, 스크린샷, 설명, 연령 등급, 지원 URL. 현재 아이콘·스플래시는 Capacitor 기본 리소스다.
- 초대 제한 설정과 심사 계정, Gemini 결제 예산 설정, 운영 서버 및 계정 삭제 실제 검증.
- 사용자 데이터는 기기 로컬 저장소 기반이며 앱 삭제 시 사라진다. 자동 기기 간 동기화는 구현되어 있지 않다. 2026-11-02 브라우저용 JSON 백업·복원을 추가했다. iOS 공유 시트의 파일 저장·복원은 실기기 검증이 남아 있다.

심사 통과나 업로드 완료 상태는 아니다. Apple은 최소 기능(4.2), 개인정보 및 계정 삭제(5.1.1) 등을 심사한다.

공식 참고: https://capacitorjs.com/docs/ios · https://developer.apple.com/app-store/review/guidelines/

## 검증 기록

- 웹 `npm run build`, 모바일 정적 export, `cap sync ios`, TypeScript 검사, plist 문법 검사 통과.
- 실제 API 주소를 제공받지 못해 모바일 export는 `https://example.com`으로 검증했다. 운영 환경 검증은 남아 있다.
- Xcode 15.4 환경이므로 Capacitor 8의 네이티브 컴파일·실기기 동작·서명·Archive 검증은 하지 못했다.
- 기존 의존성 취약점을 패치했다. 자세한 내용과 추가 서버 환경변수는 [보안 수정 기록](security-refactoring.md)을 참고한다.

## 출시 전 자동 점검

- `npm run release:check`: 운영 환경변수와 로컬 Xcode 요구사항 확인. 키 값은 출력하지 않는다.
- `npm run release:check -- --server --online`: 서버 환경변수, 실제 API 인증·iOS CORS, Redis PING, Supabase Auth 공개 키 연결 확인.
- `npm run api:smoke`: 운영 API의 미인증 차단과 iOS CORS 확인. 로컬 서버는 `npm run api:smoke -- --local` 사용.
- `npm run test:ui`: 빌드 후 모바일 화면과 탐색 흐름 검증. [UI/UX 변경 기록](ui-ux-updates.md) 참고.

자동 점검은 App Store 제출 가능 여부 전체를 판단하지 않는다. 운영자 정보, 개인정보처리방침, 정식 아이콘, Apple 서명과 실기기 검증은 별도로 완료해야 한다.
