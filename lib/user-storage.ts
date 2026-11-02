"use client";

const CURRENT_USER_KEY = 'loodi_current_user_id';
const temporaryKeys = ['loodi_record_draft_v1', 'loodi_onboarding_local_v1', 'loodi_onboarding_survey_v1', 'loodi_analysis_pending_images', 'loodi_analysis_result', 'loodi_outfit_photos', 'loodi_ai_analysis_retry_count', 'loodi_today_outfit_recommendation'];
const legacyKeys = [...temporaryKeys, 'loodi_ai_consent_v1'];

export function clearTemporaryUserData(userId: string | null) {
  if (typeof window === 'undefined') return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of legacyKeys) storage.removeItem(key);
    for (const key of temporaryKeys) storage.removeItem(`${key}:${userId || 'guest'}`);
  }
}
export function setCurrentUserStorageId(userId: string) {
  if (typeof window === 'undefined') return;
  const previous = getCurrentUserStorageId();
  if (previous !== userId) clearTemporaryUserData(previous);
  window.localStorage.setItem(CURRENT_USER_KEY, userId);
  // Unscoped legacy data has no reliable owner: never migrate it to an account.
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of legacyKeys) storage.removeItem(key);
  }
}
export function clearCurrentUserStorageId() {
  if (typeof window === 'undefined') return;
  clearTemporaryUserData(getCurrentUserStorageId());
  window.localStorage.removeItem(CURRENT_USER_KEY);
}
export function getCurrentUserStorageId() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CURRENT_USER_KEY);
}
export function scopedLocalStorageKey(baseKey: string) {
  return `${baseKey}:${getCurrentUserStorageId() || 'guest'}`;
}
export function deleteUserLocalData(userId: string) {
  if (typeof window === 'undefined') return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of Object.keys(storage)) {
      if (key.startsWith('loodi_') && key.endsWith(`:${userId}`)) storage.removeItem(key);
    }
  }
  clearTemporaryUserData(userId);
  if (getCurrentUserStorageId() === userId) window.localStorage.removeItem(CURRENT_USER_KEY);
}
