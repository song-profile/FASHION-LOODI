# FASHION-LOODI

> Your Style, Recorded.

**LOODI**는 매일의 착장을 사진으로 기록하면 AI가 의류 아이템, 컬러, 스타일, 무드를 분석하고 개인화된 코디 추천과 Style DNA를 제공하는 모바일 중심 패션 다이어리 웹앱입니다.

<p align="center">
  <img src="./docs/assets/readme/home-recommendation.jpeg" width="260" alt="LOODI home and daily recommendation screen" />
  &nbsp;&nbsp;
  <img src="./docs/assets/readme/style-dna.jpeg" width="260" alt="LOODI style DNA screen" />
</p>

## Overview

| Category | Description |
| --- | --- |
| Project | AI 기반 패션 다이어리 웹앱 |
| Goal | 착장 기록을 자동 분석하고, 누적 데이터로 개인 취향을 시각화 |
| User Flow | 로그인 -> 착장 사진 업로드 -> AI 분석 -> 타임라인 저장 -> 추천/Style DNA 확인 |
| Scope | 인증, 온보딩, AI 분석 API, 코디 추천 API, 타임라인, 옷장, Style DNA |

## Tech Stack

| Area | Stack |
| --- | --- |
| Language | TypeScript |
| Frontend | Next.js, React |
| Styling | Tailwind CSS, shadcn/ui 스타일 컴포넌트 |
| Animation | Motion |
| Auth | Supabase Auth |
| AI | Google Gemini API |
| State & Storage | React State, LocalStorage, SessionStorage, Supabase Auth Metadata |

## Core Features

| Feature | What it does |
| --- | --- |
| AI Outfit Analysis | 착장 사진에서 아이템, 컬러, 스타일, 계절감, 무드를 자동 추출 |
| Daily Recommendation | 날씨와 최근 기록을 기반으로 오늘 입기 좋은 코디 추천 |
| Outfit Timeline | 사진, 날씨, 무드, 태그, 메모를 날짜별 착장 기록으로 저장 |
| Style DNA | 누적 착장 데이터를 기반으로 스타일 분포와 취향 패턴 시각화 |
| Closet | 기록에서 감지된 의류 아이템을 카테고리별로 자동 정리 |
| Access Control | Supabase Auth 기반 로그인과 허용 계정 검증 |

## Feature Walkthrough

### 1. Home & Daily Recommendation

<table>
  <tr>
    <td width="50%" align="center">
      <img src="./docs/assets/readme/home-recommendation.jpeg" width="260" alt="LOODI home screen" />
    </td>
    <td width="50%" align="center">
      <img src="./docs/assets/readme/recommendation-items.jpeg" width="260" alt="LOODI recommendation item list" />
    </td>
  </tr>
  <tr>
    <td>
      홈 화면은 기록 스트릭, 레벨, 현재 혜택을 보여주고 사용자가 계속 기록하도록 동기를 제공합니다.
    </td>
    <td>
      추천 결과는 추천 이유, 컬러 팔레트, 상의/하의/신발 아이템으로 나누어 사용자가 바로 코디를 이해할 수 있게 구성했습니다.
    </td>
  </tr>
</table>

### 2. AI Outfit Analysis

<table>
  <tr>
    <td width="40%" align="center">
      <img src="./docs/assets/readme/ai-analysis.jpeg" width="260" alt="LOODI AI outfit analysis screen" />
    </td>
    <td width="60%">
      <b>사진 한 장으로 착장 정보를 구조화합니다.</b><br /><br />
      Gemini API가 이미지 속 의류를 분석하고, 서버에서 결과를 일정한 구조로 정규화합니다. 사용자는 저장 전에 감지된 아이템과 컬러를 확인할 수 있습니다.
      <br /><br />
      <code>items</code>, <code>colors</code>, <code>style</code>, <code>season</code>, <code>mood</code>, <code>description</code> 형태로 정리해 프론트엔드가 항상 같은 데이터 구조를 다룰 수 있게 했습니다.
    </td>
  </tr>
</table>

```json
{
  "items": [
    { "category": "상의", "name": "다크 블루 반팔 데님 셔츠" },
    { "category": "하의", "name": "라이트 브라운 와이드 팬츠" },
    { "category": "신발", "name": "오프화이트 스니커즈" }
  ],
  "colors": ["다크 블루", "라이트 브라운", "오프화이트"],
  "style": ["캐주얼"],
  "season": "여름",
  "mood": ["편안한"]
}
```

### 3. Timeline Diary

<table>
  <tr>
    <td width="40%" align="center">
      <img src="./docs/assets/readme/timeline-detail.jpeg" width="260" alt="LOODI timeline detail screen" />
    </td>
    <td width="60%">
      <b>착장을 단순 사진이 아니라 맥락과 함께 저장합니다.</b><br /><br />
      타임라인에서는 날짜별 착장 기록을 확인하고, 사진과 함께 저장 시간, 날씨, 무드, 태그, AI 분석 문장, 직접 작성한 메모를 관리할 수 있습니다.
    </td>
  </tr>
</table>

### 4. Style DNA

<table>
  <tr>
    <td width="40%" align="center">
      <img src="./docs/assets/readme/style-dna.jpeg" width="260" alt="LOODI Style DNA screen" />
    </td>
    <td width="60%">
      <b>기록이 쌓일수록 취향이 데이터로 보입니다.</b><br /><br />
      누적된 착장 기록에서 스타일 태그를 집계해 Casual, Vintage, Minimal 같은 스타일 비율을 시각화합니다. 사용자는 본인이 자주 입는 무드와 스타일 흐름을 한눈에 확인할 수 있습니다.
    </td>
  </tr>
</table>

### 5. Closet

<table>
  <tr>
    <td width="40%" align="center">
      <img src="./docs/assets/readme/closet.jpeg" width="260" alt="LOODI closet screen" />
    </td>
    <td width="60%">
      <b>AI가 감지한 아이템을 자동으로 옷장화합니다.</b><br /><br />
      타임라인 기록에서 발견된 상의, 하의, 아우터, 신발 등을 카테고리별로 모아 보여줍니다. 반복적으로 등장한 아이템은 저장 횟수와 함께 확인할 수 있어 실제 착장 데이터 기반의 옷장 역할을 합니다.
    </td>
  </tr>
</table>

## Technical Focus

### AI Response Normalization

AI 응답은 매번 완전히 동일하지 않기 때문에, API Route에서 응답을 바로 전달하지 않고 검증, 파싱, 정규화를 거친 뒤 프론트엔드에 반환하도록 구성했습니다.

- 요청 body와 이미지 MIME type 검증
- Gemini 응답에서 JSON 객체 추출
- 누락 필드 기본값 보정
- 허용 카테고리 외 값 제거
- 빈 배열과 빈 문자열 정리
- 프론트엔드가 사용하는 고정 응답 구조로 반환

### Reliability Handling

외부 AI API 호출 중 일시적인 실패가 발생할 수 있어 서버 레벨에서 실패율을 줄이는 방어 로직을 두었습니다.

- 429, 503, quota 계열 오류에 retry/backoff 적용
- 특정 모델 실패 시 다른 Gemini 모델로 fallback
- API 실패 시 사용자에게 보여줄 수 있는 안정적인 오류 메시지 반환
- 인증된 사용자와 허용 계정만 AI API를 호출하도록 제한

### Personalization From Records

착장 기록은 저장에서 끝나지 않고 추천과 분석의 입력 데이터로 재사용됩니다. 최근 기록, 감지된 아이템, 컬러, 스타일 태그를 바탕으로 홈 추천과 Style DNA가 동적으로 구성됩니다.

## Project Structure

```txt
app/
  api/
    analyze-outfit/       # Gemini 기반 착장 분석 API
    recommend-outfit/     # 개인화 코디 추천 API
    contact-chat/         # LOODI AI 문의 챗봇 API
  onboarding/             # 온보딩, 사진 업로드, AI 분석 플로우
  (main)/                 # Home, Record, Timeline, DNA, Closet
components/
  auth/                   # 접근 제어 컴포넌트
  blocks/                 # 주요 화면 블록
  navigation/             # 하단 네비게이션
lib/
  access-control.ts       # 허용 이메일 기반 접근 제어
  auth-identifier.ts      # 아이디를 Supabase Auth 이메일 형식으로 변환
  authenticated-fetch.ts  # 로그인 토큰 포함 API 요청
  onboarding-analysis-images.ts
  outfit-diary.ts
```

## Local Run

```bash
npm install
npm run dev
```

```txt
http://127.0.0.1:3000
```
