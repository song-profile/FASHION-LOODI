"use client";
import { scopedLocalStorageKey } from './user-storage';

export function ensureAiConsent(pathname: string) {
  if (!['/api/analyze-outfit', '/api/recommend-outfit', '/api/contact-chat'].includes(pathname)) return;
  const key = scopedLocalStorageKey('loodi_ai_consent_v2');
  if (window.localStorage.getItem(key)) return;
  if (!window.confirm('AI 분석·추천·문의를 위해 선택한 착장 사진, 착장 기록 또는 문의 내용을 LOODI 서버를 통해 Google Gemini로 전송합니다. 사진에 얼굴 등 개인정보가 포함될 수 있어요. 전송에 동의할까요?')) throw new Error('AI 전송에 동의하지 않았어요.');
  window.localStorage.setItem(key, 'true');
}
