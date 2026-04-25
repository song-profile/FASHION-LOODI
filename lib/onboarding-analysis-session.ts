const RETRY_KEY = "loodi_ai_analysis_retry_count";

export function getAnalysisRetryCount() {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(RETRY_KEY);
  const parsed = Number(raw ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function setAnalysisRetryCount(value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RETRY_KEY, String(Math.max(0, value)));
}

export function incrementAnalysisRetryCount() {
  const next = getAnalysisRetryCount() + 1;
  setAnalysisRetryCount(next);
  return next;
}

export function resetAnalysisRetryCount() {
  setAnalysisRetryCount(0);
}
