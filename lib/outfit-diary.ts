"use client";

import { scopedLocalStorageKey } from "@/lib/user-storage";

const STORAGE_KEY = "loodi_outfit_diary";

export type DiaryPhoto = { base64: string; mediaType: string };
export type DiaryAnalyzedItem = { category: string; name: string };

export type DiaryEntry = {
  id: string;
  date: string; // YYYY-MM-DD (local time)
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp, set on edit
  photos: DiaryPhoto[];
  title?: string;
  weather?: string;
  temperature?: number;
  mood?: string;
  items?: DiaryAnalyzedItem[];
  colors?: string[];
  styleNote?: string;
  memo?: string;
  tags: string[];
};

export type DiaryEntryPatch = Partial<
  Pick<DiaryEntry, "tags" | "styleNote" | "memo" | "title" | "weather" | "mood">
>;

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function readDiaryEntries(): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(scopedLocalStorageKey(STORAGE_KEY));
    if (!raw) return [];
    const entries = JSON.parse(raw) as DiaryEntry[];
    return entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

export function appendDiaryEntry(
  input: Omit<DiaryEntry, "id" | "createdAt">,
): DiaryEntry | null {
  if (typeof window === "undefined") return null;
  const entry: DiaryEntry = {
    ...input,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
  try {
    const existing = readDiaryEntries();
    const next = [entry, ...existing];
    window.localStorage.setItem(scopedLocalStorageKey(STORAGE_KEY), JSON.stringify(next));
    return entry;
  } catch (err) {
    console.error("Failed to persist diary entry", err);
    return null;
  }
}

export function getEntriesByDateString(dateStr: string): DiaryEntry[] {
  return readDiaryEntries().filter((entry) => entry.date === dateStr);
}

export function deleteDiaryEntry(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const entries = readDiaryEntries();
    const next = entries.filter((entry) => entry.id !== id);
    if (next.length === entries.length) return false;
    window.localStorage.setItem(scopedLocalStorageKey(STORAGE_KEY), JSON.stringify(next));
    return true;
  } catch (err) {
    console.error("Failed to delete diary entry", err);
    return false;
  }
}

export function updateDiaryEntry(
  id: string,
  patch: DiaryEntryPatch,
): DiaryEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const entries = readDiaryEntries();
    let updated: DiaryEntry | null = null;
    const next = entries.map((entry) => {
      if (entry.id !== id) return entry;
      updated = {
        ...entry,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    if (!updated) return null;
    window.localStorage.setItem(scopedLocalStorageKey(STORAGE_KEY), JSON.stringify(next));
    return updated;
  } catch (err) {
    console.error("Failed to update diary entry", err);
    return null;
  }
}

export function diaryPhotoToDataUrl(photo: DiaryPhoto): string {
  return `data:${photo.mediaType};base64,${photo.base64}`;
}

export function computeStreakDays(entries: DiaryEntry[]): number {
  if (entries.length === 0) return 0;
  const dateSet = new Set(entries.map((entry) => entry.date));

  const today = new Date();
  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Allow today to be empty: start from yesterday if today missing.
  if (!dateSet.has(formatDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (dateSet.has(formatDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export type StreakLevel = {
  level: number;
  totalEntries: number;
  streak: number;
  nextLevelAt: number;
  remaining: number;
  perks: { current: string; next: string };
};

const LEVEL_PERKS = [
  { entries: 0, current: "오늘부터 LOODI와 함께", next: "AI 추천 횟수 +1" },
  { entries: 3, current: "AI 추천 1일 3회", next: "AI 추천 1일 5회 + 컬러 팔레트 잠금 해제" },
  { entries: 7, current: "AI 추천 1일 5회 · 컬러 팔레트", next: "스타일 DNA 그래프 + 무드 인사이트" },
  { entries: 14, current: "스타일 DNA + 무드 인사이트", next: "월간 코디 리포트 PDF" },
  { entries: 30, current: "월간 리포트 · 모든 기능 해제", next: "최고 레벨 달성!" },
];

export function computeStreakLevel(entries: DiaryEntry[]): StreakLevel {
  const total = entries.length;
  const streak = computeStreakDays(entries);

  let level = 1;
  for (let i = LEVEL_PERKS.length - 1; i >= 0; i -= 1) {
    if (total >= LEVEL_PERKS[i].entries) {
      level = i + 1;
      break;
    }
  }

  const nextIdx = Math.min(level, LEVEL_PERKS.length - 1);
  const nextLevelAt = LEVEL_PERKS[nextIdx]?.entries ?? LEVEL_PERKS[LEVEL_PERKS.length - 1].entries;
  const remaining = Math.max(0, nextLevelAt - total);

  return {
    level,
    totalEntries: total,
    streak,
    nextLevelAt,
    remaining,
    perks: {
      current: LEVEL_PERKS[level - 1].current,
      next: LEVEL_PERKS[level - 1].next,
    },
  };
}
