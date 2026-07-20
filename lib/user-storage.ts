"use client";

const CURRENT_USER_KEY = "loodi_current_user_id";

export function setCurrentUserStorageId(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CURRENT_USER_KEY, userId);
}

export function clearCurrentUserStorageId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CURRENT_USER_KEY);
}

export function getCurrentUserStorageId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CURRENT_USER_KEY);
}

export function scopedLocalStorageKey(baseKey: string) {
  const userId = getCurrentUserStorageId();
  return userId ? `${baseKey}:${userId}` : `${baseKey}:guest`;
}
