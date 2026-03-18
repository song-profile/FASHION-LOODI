# Onboarding Analytics Tracking Plan

## Tracking Principles
- 모든 이벤트에 공통 속성 포함:
  - `user_id` (or anonymous id)
  - `session_id`
  - `timestamp`
  - `platform` (`ios`, `android`, `web`)
  - `app_version`
  - `onboarding_version`
- Step 이벤트에는 `step_id`, `step_name`, `step_order`를 표준화.

## Event Inventory

| Event Name | Trigger Point | Properties | Why It Matters (KPI) |
|---|---|---|---|
| `onboarding_started` | Welcome 화면에서 `시작하기` 클릭 시 | `entry_source`, `has_resume_draft`, `is_returning_user` | 온보딩 진입율/유입 품질 측정 |
| `onboarding_step_viewed` | 각 step 화면 first render 시 | `step_id`, `step_order`, `resume_mode`, `draft_age_sec` | 퍼널 단계별 이탈 구간 파악 |
| `onboarding_step_completed` | step CTA로 정상 다음 단계 이동 시 | `step_id`, `step_order`, `time_spent_sec`, `validation_error_count` | 단계별 완료율/마찰 포인트 측정 |
| `onboarding_survey_skipped` | 설문 skip 확인 모달에서 확정 시 | `from_step`, `skip_reason?`, `selected_count` | 개인화 데이터 손실 및 skip 패턴 분석 |
| `onboarding_photo_uploaded` | 업로드 파일 검증 후 저장 성공 시 | `photo_count_total`, `new_photo_count`, `file_types`, `source` (`camera`,`gallery`) | 핵심 활성 행동(첫 기록 준비) 추적 |
| `onboarding_weather_fetched` | 날씨 자동 태깅 성공/실패 시 | `result` (`success`,`denied`,`error`,`manual`), `weather_tag?`, `latency_ms` | 컨텍스트 데이터 확보율 및 권한 UX 개선 |
| `onboarding_ai_analysis_started` | `AI 분석 시작` CTA 클릭 시 | `photo_count`, `has_weather`, `emotion_count`, `tpo_count` | AI 분석 진입률(핵심 activation) 추적 |
| `onboarding_ai_analysis_succeeded` | 분석 결과 화면 진입 시 | `latency_ms`, `retry_count`, `confidence_score?` | 모델 성공률/체감 속도 KPI |
| `onboarding_ai_analysis_failed` | 분석 실패 상태 화면 표시 시 | `error_type`, `latency_ms`, `retry_count` | 실패율, 원인 분포, 안정성 KPI |
| `onboarding_retry_clicked` | 실패 화면에서 `다시 분석하기` 클릭 시 | `retry_count_before`, `error_type_last` | 복구 시도율/실패 이후 이탈률 측정 |
| `onboarding_diary_completed` | 완료 화면에서 `기록 완료` 저장 성공 시 | `photo_count`, `memo_length`, `has_ai_note`, `streak_day` | 첫 기록 완료율(핵심 activation KPI) |
| `onboarding_completed` | 온보딩 완료 플래그 저장 시 | `total_duration_sec`, `skipped_steps`, `retry_total` | 종단 완료율/완주 시간 분석 |
| `onboarding_redirected_home` | 완료 후 Home 이동 성공 시 | `redirect_type` (`auto`,`manual`), `transition_ms` | 완료 후 홈 진입 성공률/전환 품질 측정 |

## KPI Mapping
- **Primary KPI**: `onboarding_completed / onboarding_started`
- **Activation KPI**: `onboarding_diary_completed / onboarding_started`
- **AI Reliability KPI**: `onboarding_ai_analysis_succeeded / onboarding_ai_analysis_started`
- **Friction KPI**:
  - 평균 `validation_error_count`
  - `onboarding_survey_skipped` 비율
  - `onboarding_ai_analysis_failed` 비율

## Funnel Definition
1. `onboarding_started`
2. `onboarding_step_completed` (survey_style)
3. `onboarding_step_completed` (survey_color)
4. `onboarding_step_completed` (survey_fit)
5. `onboarding_photo_uploaded`
6. `onboarding_ai_analysis_started`
7. `onboarding_ai_analysis_succeeded`
8. `onboarding_diary_completed`
9. `onboarding_completed`
10. `onboarding_redirected_home`

## Quality Checks
- duplicate 방지: 각 `step_viewed`는 `session_id + step_id` 기준 dedupe.
- 이벤트 순서 보장: `ai_analysis_succeeded`는 `ai_analysis_started` 이후만 허용.
- schema versioning: 이벤트 payload에 `schema_version` 포함.
