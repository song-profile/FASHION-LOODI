# Onboarding Local Persistence & Resume UX Spec

## 1) What data is saved locally at each step

### Welcome
- `lastStep: welcome`
- `updatedAt`

### Survey Q1/Q2/Q3
- `survey.styles: string[]`
- `survey.colors: string[]`
- `survey.fit: Slim | Regular | Oversized | null`
- `survey.skipped: boolean`
- `lastStep: survey_style | survey_color | survey_fit`
- `updatedAt`

### Upload Step
- `upload.photoCount: number` (image files themselves are not persisted in localStorage)
- `upload.emotions: string[]`
- `upload.tpo: string[]`
- `upload.weatherTag: string | null`
- `upload.memo: string`
- `lastStep: upload`
- `updatedAt`

### Analysis
- `lastStep: analysis_loading | analysis_result`
- `updatedAt`
- `analysis retry count` (separate key)

### Completion
- `completed: true`
- `lastStep: completed`
- `updatedAt`

## 2) When autosave happens
- On each survey selection change (style/color/fit)
- On upload step changes:
  - photo count changes
  - emotion tags changes
  - TPO tags changes
  - weather tag changes
  - memo input changes
- On step entry, `lastStep` is updated immediately
- On completion CTA success, `completed=true` is stored

## 3) How resume entry works
- On Welcome screen load:
  - read local onboarding state
  - if `completed=true`, no resume prompt
  - if state is valid and `lastStep` is meaningful, show soft resume banner
- Banner copy: `이전 온보딩 진행 상태를 불러왔어요.`
- Banner actions:
  - `이어서 진행` -> route to `stepToRoute(lastStep)`
  - `처음부터` -> clear local onboarding data and stay on Welcome

## 4) What happens if local data is stale or incomplete
- Stale threshold: 14 days without update
- If stale:
  - clear local onboarding data automatically
  - no resume banner shown
- If incomplete payload (missing fields / parse error):
  - fallback to safe defaults
  - continue from Welcome without crash
- If photos were previously uploaded but binary files are unavailable:
  - restore metadata (photo count may reset to current session reality)
  - keep tags/memo/weather so user does not lose context

## UX Goal
- Preserve momentum without surprising restarts
- Always offer explicit control: continue or restart
- Keep copy calm and non-technical
