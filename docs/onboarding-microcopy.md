# Onboarding UX Microcopy

## Welcome (Step 1)
### Headlines
- `LOODI`
- `Your Style, Recorded.`

### Subtitles
- `매일의 룩을 AI 다이어리로 정리해 보세요.`

### Buttons
- Primary: `시작하기`
- Secondary link: `이미 계정이 있어요`

### Helper
- `이어서 진행하거나, 새로 시작할 수 있어요.`

## Auth Entry
### OAuth Buttons
- `Google로 계속하기`
- `Kakao로 계속하기`
- `Apple로 계속하기`

### Email
- `이메일로 로그인`

### Login failure
- `로그인에 실패했어요. 이메일 또는 비밀번호를 다시 확인해 주세요.`

## Survey Q1 (Style)
### Headline
- `Build your style profile`

### Subtitle
- `당신다운 스타일 방향을 최소 1개 선택해 주세요.`

### Buttons
- Primary: `Next`
- Secondary: `Skip for now`

### Disabled text
- `Select at least 1 style to continue.`

## Survey Q2 (Color)
### Headline
- `Color preferences`

### Subtitle
- `자주 입는 컬러를 최대 3개까지 선택해 주세요.`

### Buttons
- Primary: `Next`
- Secondary: `Skip for now`

### Helper / validation
- Default: `Select at least 1 color to continue.`
- Limit reached: `You can select up to 3 colors.`
- Progress hint: `{n}/3 selected`

## Survey Q3 (Fit)
### Headline
- `Preferred fit`

### Subtitle
- `실루엣 추천을 위해 선호 핏 1개를 선택해 주세요.`

### Buttons
- Primary: `Continue to upload`
- Secondary: `Skip for now`

### Disabled text
- `Choose one fit to continue.`

## Upload (Step 3)
### Headline
- `Upload your outfit`

### Subtitle
- `AI 분석을 위해 1~5장의 착장 사진을 업로드해 주세요.`

### Upload guidance
- `Add photos`
- `JPEG, PNG, HEIC 형식을 지원해요.`
- `최대 5장까지 업로드할 수 있어요.`

### Action sheet
- `Camera`
- `Gallery`
- `Cancel`

### Error / retry
- `이미지 업로드에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.`
- `Retry upload`
- `지원하지 않는 형식입니다. JPEG, PNG, HEIC 파일을 선택해 주세요.`

### Disabled CTA text
- CTA: `AI 분석 시작`
- Disabled helper: `최소 1장의 사진을 업로드해야 분석을 시작할 수 있어요.`

## Permission Request Copy
### GPS denied
- `위치 권한이 없어 날씨를 자동으로 가져올 수 없어요.`
- Primary: `날씨 직접 입력`
- Secondary: `건너뛰기`

### Camera denied
- `카메라 권한이 비활성화되어 있어요. 설정에서 권한을 허용하거나 갤러리를 이용해 주세요.`
- Primary: `갤러리에서 선택`
- Secondary: `설정 열기`

## AI Loading (Step 4)
### Headline
- `AI가 스타일을 분석하고 있어요`

### Stage labels
- `Image quality check`
- `Garment detection`
- `Style DNA matching`
- `Diary-ready summary`

### Calm reassurance
- `결과 정확도를 위해 조금 더 꼼꼼히 확인하고 있어요. 잠시만 기다려 주세요.`

## AI Failure / Retry
### Headline
- `분석을 완료하지 못했어요`

### Body
- `네트워크 상태 또는 이미지 품질 때문에 결과 생성이 지연되었습니다.`

### Buttons
- Primary: `다시 분석하기`
- Secondary: `수동으로 태깅하기`

### Retry hint
- `남은 재시도 횟수: {n} / 3`
- `3회 연속 실패 시 수동 태깅 화면으로 자동 이동합니다.`

## AI Result
### Headline
- `AI style analysis result`

### Sections
- `Style Category Ratio`
- `Detected Item Tags`
- `Color Palette`
- `Silhouette Result`
- `AI Style Note`

### CTA
- `다이어리에 기록하기`

## Completion (Step 5)
### Date header
- `{YYYY년 M월 D일}`

### Title
- `첫 번째 기록 완성!`

### Memo label
- `Memo`

### CTA
- `기록 완료`

### Save success
- `저장 완료. 홈으로 이동합니다.`

### Retention nudge
- `내일도 기록하면 2일 연속 스타일 스트릭이 시작돼요.`
