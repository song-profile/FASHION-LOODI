# Onboarding Edge Cases UX Spec

## Scope
This spec defines UX handling for onboarding exception scenarios in LOODI.

## Cases

| Case | Trigger | UI Pattern | Exact User-facing Message | Primary Action | Secondary Action | Resume Logic |
|---|---|---|---|---|---|---|
| App closed during onboarding and resumed later | User force-closes app or app process is terminated during onboarding, then returns | Full screen restore prompt + inline summary card | `이전 온보딩 진행 상태를 불러왔어요.` | `이어서 진행` | `처음부터 다시` | Restore local draft and reopen last incomplete step. If user selects `처음부터 다시`, clear onboarding draft/session data and navigate to Welcome. |
| Image upload network error | Upload request fails due to connection timeout, offline state, or API error | Inline error card under upload zone + toast | `이미지 업로드에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.` | `다시 업로드` | `나중에 업로드` | Keep selected files in local session memory; retry same payload. If `나중에 업로드`, remain on current step and preserve pending uploads for next re-entry. |
| AI analysis timeout over 15 seconds | Analysis request has no successful response after 15 seconds | Full screen loading state update + calm reassurance inline notice | `분석이 예상보다 오래 걸리고 있어요. 안정적으로 처리 중입니다.` | `계속 기다리기` | `수동 태깅으로 전환` | If waiting continues, keep polling in background. If fallback selected, navigate to manual tagging and carry uploaded image context. |
| GPS permission denied | Geolocation permission is denied or unavailable when trying auto weather tagging | Bottom sheet (weather fallback input) | `위치 권한이 없어 날씨를 자동으로 가져올 수 없어요.` | `날씨 직접 입력` | `건너뛰기` | Manual weather input saves as weather tag. If skipped, continue flow with empty weather tag and allow later edit. |
| Camera permission denied | Camera launch fails with permission denied | Modal | `카메라 권한이 비활성화되어 있어요. 설정에서 권한을 허용하거나 갤러리를 이용해 주세요.` | `갤러리에서 선택` | `설정 열기` | `갤러리에서 선택` opens gallery picker immediately. Returning from settings reopens upload action sheet state. |
| Non-outfit image uploaded | Vision classifier confidence for outfit content is below threshold | Inline validation + confirmation modal | `의상 중심 이미지로 보기 어려워요. 전신 또는 상반신 착장 사진으로 다시 올려주세요.` | `다시 선택` | `그대로 진행` | Default path encourages reselection. If `그대로 진행`, continue analysis with low-confidence flag and surface reduced confidence notice in result. |
| User already completed onboarding returns | User with `onboarding_completed=true` enters onboarding route directly | Full screen guard + auto redirect | `온보딩이 이미 완료된 계정입니다.` | `홈으로 이동` | `온보딩 다시 보기` | Auto-redirect to Home by default. `온보딩 다시 보기` opens read-only preview mode; completion state remains unchanged. |

## Global UX Rules
- Keep tone calm, reassuring, and non-technical.
- Never discard user input without explicit confirmation.
- Always provide two recovery paths: retry now and alternative path.
- Preserve partial progress across app restart via local draft storage.
