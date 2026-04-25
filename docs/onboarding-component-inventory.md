# Onboarding UI Component Inventory

## Scope
Reusable component definitions for LOODI onboarding MVP.

| Component | Purpose | Props | States | Reusable Scope |
|---|---|---|---|---|
| `ValuePropositionCard` | 핵심 가치 1개를 카드로 전달 | `title`, `description`, `icon?`, `tone?` | `default`, `hover`, `pressed` | Welcome, marketing intro sections |
| `FixedCtaBar` | 하단 고정 CTA 영역 일관화 | `primaryLabel`, `onPrimaryClick`, `secondaryLabel?`, `onSecondaryClick?`, `disabled?`, `helperText?` | `enabled`, `disabled`, `loading` | 모든 온보딩 스텝 |
| `TopProgressBar` | 단계 진행률 표시 | `step`, `total`, `label?` | `default`, `animated-update` | Survey, Upload, Analysis, Completion |
| `StyleSelectionCard` | 스타일 선택(멀티) 카드 | `id`, `title`, `note`, `selected`, `onToggle`, `disabled?` | `unselected`, `selected`, `disabled` | Survey Q1 |
| `ColorCircleSelector` | 컬러 선택(멀티, 제한) UI | `name`, `hex`, `selected`, `onToggle`, `disabled?` | `unselected`, `selected`, `capped-disabled` | Survey Q2, profile edit |
| `FitOptionListCard` | 핏 단일 선택 리스트 | `label`, `selected`, `onSelect`, `disabled?` | `unselected`, `selected`, `disabled` | Survey Q3, settings |
| `ToggleTagChip` | 감정/TPO 태그 토글 | `label`, `selected`, `onToggle`, `size?` | `unselected`, `selected`, `disabled` | Upload, diary edit |
| `UploadDropzone` | 업로드 진입점(점선 박스) | `count`, `max`, `onClick`, `accept`, `helperText?` | `idle`, `active`, `error`, `full` | Upload step, diary add |
| `UploadedImageThumbnail` | 업로드 이미지 썸네일 + 액션 | `src`, `alt`, `onDelete`, `onRetake`, `status?` | `default`, `uploading`, `error`, `disabled` | Upload step |
| `CaptureActionSheet` | 카메라/갤러리 선택 시트 | `open`, `onClose`, `onCamera`, `onGallery` | `closed`, `open` | Upload flows |
| `WeatherBadge` | 날씨 상태/값 표시 | `value?`, `status`, `onFallbackClick?` | `loading`, `resolved`, `denied`, `error`, `empty` | Upload, diary card |
| `AiStageTracker` | AI 4단계 상태 추적 | `stages[]`, `activeIndex`, `completedIndices[]` | `waiting`, `analyzing`, `completed` | Analysis loading |
| `StyleRatioBarCard` | 스타일 비율 바 목록 | `items: {label,value}[]`, `title?` | `default`, `empty` | Analysis result |
| `DetectedItemChipList` | 감지 아이템 칩 리스트 | `items[]`, `title?` | `default`, `overflow` | Analysis result, diary detail |
| `ColorPaletteSwatchRow` | 팔레트 색상 스와치 | `colors[]`, `showHex?`, `title?` | `default`, `empty` | Analysis result |
| `StyleNoteCard` | AI 스타일 노트 카드 | `title?`, `content`, `tone?` | `default`, `highlight` | Analysis result, completion |
| `SuccessNudgeBanner` | 리텐션 유도 메시지 | `message`, `icon?`, `variant?` | `default`, `celebration` | Completion, home follow-up |
| `AppToast` | 짧은 피드백 전달 | `message`, `type`, `duration?`, `open` | `info`, `success`, `error` | 글로벌 |
| `RetryPanel` | 실패 복구 패널 | `title`, `description`, `primaryLabel`, `onPrimary`, `secondaryLabel?`, `onSecondary?`, `attemptInfo?` | `default`, `loading` | Upload error, analysis failure |
| `PermissionBottomSheet` | 권한 거부 시 대응 동선 | `open`, `title`, `description`, `primaryLabel`, `onPrimary`, `secondaryLabel`, `onSecondary` | `closed`, `open` | GPS/camera denied |

## Composition Rules
- `FixedCtaBar` + `TopProgressBar`를 모든 step의 기본 골격으로 유지.
- 선택형 컴포넌트(`StyleSelectionCard`, `ColorCircleSelector`, `FitOptionListCard`)는 동일한 선택 피드백(테두리/그림자/체크 표시) 규칙 사용.
- 에러 처리 컴포넌트(`AppToast`, `RetryPanel`, `PermissionBottomSheet`)는 우선순위를 `inline -> sheet -> full-screen` 순으로 적용.
