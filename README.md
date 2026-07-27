# FASHION-LOODI

> AI가 오늘의 착장을 분석하고, 기록이 쌓일수록 나만의 스타일 패턴을 정리해 주는 패션 다이어리 웹앱

LOODI는 사용자가 매일 입은 옷을 사진과 함께 기록하면 Gemini 기반 AI가 아이템, 색상, 스타일, 무드를 자동 태깅하고, 누적된 기록을 바탕으로 Style DNA와 오늘의 코디 추천을 제공하는 Next.js 프로젝트입니다.

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| AI 착장 분석 | 업로드한 사진에서 보이는 의류, 색상, 스타일, 계절감, 무드를 자동 분석합니다. |
| Style DNA | 누적된 기록을 기반으로 자주 입는 색상, 무드, 아이템 경향을 시각적으로 정리합니다. |
| 오늘의 코디 추천 | 최근 코디 기록, 날씨, 오늘 사진을 참고해 개인화된 코디를 추천합니다. |
| 패션 다이어리 | 날짜별 착장 사진, 태그, 메모를 타임라인 형태로 저장합니다. |
| 온보딩 플로우 | 선호 스타일, 컬러, 핏을 수집해 초기 추천 품질을 높입니다. |
| Google/아이디 로그인 | Supabase Auth 기반 Google 로그인과 아이디/비밀번호 로그인을 지원합니다. |
| 접근 제한 | 허용된 이메일만 앱에 진입하고 AI API를 사용할 수 있도록 제한합니다. |

## 주요 화면 미리보기

| Home | AI Recommendation |
| --- | --- |
| <img src="./docs/assets/readme/home-recommendation.jpeg" width="260" alt="LOODI home screen with daily streak, level, weather and outfit recommendation" /> | <img src="./docs/assets/readme/recommendation-items.jpeg" width="260" alt="LOODI outfit recommendation item list" /> |
| 홈 화면에서 기록 스트릭, 레벨, 현재 혜택을 확인하고 날씨 기반 오늘의 코디 추천을 받을 수 있습니다. | 추천 이유, 추천 컬러, 카테고리별 아이템을 함께 보여주며 쇼핑 탐색으로 이어질 수 있게 구성했습니다. |

| AI Analysis | Timeline Detail |
| --- | --- |
| <img src="./docs/assets/readme/ai-analysis.jpeg" width="260" alt="LOODI AI outfit analysis result screen" /> | <img src="./docs/assets/readme/timeline-detail.jpeg" width="260" alt="LOODI timeline outfit detail screen" /> |
| 착장 사진을 업로드하면 Gemini가 아이템과 색상을 분석하고 다이어리 저장 전 확인 화면을 제공합니다. | 저장된 착장은 날짜별 타임라인에서 사진, 날씨, 무드, 태그, 메모와 함께 상세 확인할 수 있습니다. |

| Style DNA | Closet |
| --- | --- |
| <img src="./docs/assets/readme/style-dna.jpeg" width="260" alt="LOODI Style DNA distribution screen" /> | <img src="./docs/assets/readme/closet.jpeg" width="260" alt="LOODI closet item summary screen" /> |
| 누적 기록을 기반으로 사용자의 스타일 분포를 계산하고 Casual, Vintage, Minimal 같은 취향 비율을 시각화합니다. | 기록에서 감지된 아이템을 카테고리별로 모아 옷장처럼 확인할 수 있습니다. |

## 사용 예시

### 1. 오늘의 룩 기록

1. `Record`에서 착장 사진을 업로드합니다.
2. AI가 사진 속 아이템과 색상을 분석합니다.
3. 사용자는 분석 결과를 확인하고 다이어리에 저장합니다.

예시 결과:

```json
{
  "items": [
    { "category": "아우터", "name": "네이비 후드집업" },
    { "category": "상의", "name": "블랙 그래픽 티셔츠" }
  ],
  "colors": ["네이비", "블랙"],
  "style": ["캐주얼", "스트릿"],
  "season": "간절기",
  "mood": ["편안한"],
  "description": "네이비 후드집업과 블랙 그래픽 티셔츠를 매치한 편안한 캐주얼 룩입니다."
}
```

### 2. Style DNA 확인

기록이 쌓이면 `DNA` 화면에서 다음 정보를 확인할 수 있습니다.

- 자주 입는 컬러
- 선호하는 스타일 무드
- 최근 착장 기반 아이템 경향
- 기록 개수에 따른 다음 기능 안내

### 3. 오늘의 코디 추천

`Home` 화면에서는 최근 기록과 날씨 정보를 바탕으로 오늘 입기 좋은 코디를 추천합니다.

예시:

```json
{
  "reasoning": "최근 캐주얼한 무드를 자주 기록했고, 오늘 날씨가 선선해 가벼운 아우터 중심의 코디를 추천합니다.",
  "recommendedColors": ["네이비", "화이트", "그레이"],
  "recommendedItems": [
    {
      "category": "아우터",
      "name": "네이비 오버사이즈 집업",
      "searchKeyword": "네이비 오버사이즈 집업"
    },
    {
      "category": "하의",
      "name": "그레이 와이드 팬츠",
      "searchKeyword": "그레이 와이드 팬츠"
    }
  ]
}
```

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Framework | Next.js, React, TypeScript |
| Styling | Tailwind CSS, shadcn/ui 스타일 컴포넌트 |
| Animation | Motion |
| Auth | Supabase Auth |
| AI | Google Gemini API |
| Deployment | Vercel |
| Data | LocalStorage, SessionStorage, Supabase Auth metadata |

## 프로젝트 구조

```txt
app/
  api/
    analyze-outfit/       # Gemini 기반 착장 분석 API
    recommend-outfit/     # 개인화 코디 추천 API
    contact-chat/         # LOODI AI 문의 챗봇 API
  onboarding/             # 온보딩, 사진 업로드, AI 분석 플로우
  (main)/                 # 홈, 기록, 타임라인, 옷장, Style DNA
components/
  auth/                   # 접근 제어 컴포넌트
  blocks/                 # 주요 화면 블록
  navigation/             # 하단 네비게이션
lib/
  access-control.ts       # 허용 이메일 기반 접근 제어
  auth-identifier.ts      # 아이디를 Supabase Auth 이메일 형식으로 변환
  authenticated-fetch.ts  # 로그인 토큰을 포함한 API 요청
  onboarding-analysis-images.ts
  outfit-diary.ts
```

## AI 응답 안정화

AI 모델 응답은 항상 같은 구조로 오지 않을 수 있기 때문에, 서버 API에서 다음 단계를 거쳐 프론트에 안정적인 데이터를 반환합니다.

- 요청 body와 이미지 MIME type 검증
- 모델 응답에서 JSON 객체만 추출
- `items`, `colors`, `style`, `season`, `mood`, `description` 구조로 정규화
- 허용되지 않은 카테고리와 빈 값 제거
- 누락된 값은 기본값으로 보정
- 503, 429, quota 오류에는 retry/backoff 적용
- 특정 Gemini 모델 실패 시 다른 모델로 fallback

## 로컬 실행

```bash
npm install
npm run dev
```

기본 실행 주소:

```txt
http://127.0.0.1:3000
```

## 환경 변수

`.env.local.example`을 참고해 `.env.local`을 생성합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

NEXT_PUBLIC_ALLOWED_EMAILS=
ALLOWED_EMAILS=

GEMINI_API_KEY=
GEMINI_ANALYSIS_MODEL=
```

### 접근 제한 예시

특정 계정만 앱을 사용할 수 있게 하려면 Vercel 또는 `.env.local`에 다음처럼 설정합니다.

```env
NEXT_PUBLIC_ALLOWED_EMAILS=owner@example.com
ALLOWED_EMAILS=owner@example.com
```

아이디/비밀번호 로그인은 내부적으로 Supabase Auth 이메일 형식으로 변환됩니다.

```txt
my-loodi-id -> my-loodi-id@users.loodi.app
```

## 배포

Vercel에 GitHub repository를 연결하면 `main` 브랜치 push 시 자동 배포됩니다.

```txt
main push -> Vercel build -> Production deployment
```

환경 변수를 수정한 경우에는 Vercel에서 `Redeploy`를 실행해야 변경 사항이 반영됩니다.

## Supabase 설정

Google 로그인을 사용하려면 Supabase Auth 설정에 배포 URL을 등록해야 합니다.

```txt
Site URL:
https://your-vercel-domain.vercel.app

Redirect URL:
https://your-vercel-domain.vercel.app/auth/callback
```

아이디/비밀번호 로그인을 사용하려면 Email Provider를 활성화합니다.

```txt
Enable Email Provider: ON
Confirm Email: OFF
```

## 현재 상태

- 모바일 중심 UI로 구현된 웹앱
- Vercel Production 배포 가능
- Supabase Auth 기반 로그인
- Gemini 기반 사진 분석 및 추천 API
- 허용 이메일 기반 개인 접근 제한
