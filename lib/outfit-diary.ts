"use client";

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
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return updated;
  } catch (err) {
    console.error("Failed to update diary entry", err);
    return null;
  }
}

export function diaryPhotoToDataUrl(photo: DiaryPhoto): string {
  return `data:${photo.mediaType};base64,${photo.base64}`;
}
