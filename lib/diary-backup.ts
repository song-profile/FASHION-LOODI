import { z } from 'zod';
import type { DiaryEntry } from './outfit-diary';

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
const timestamp = z.string().max(40).refine(value => Number.isFinite(Date.parse(value)));
const text = z.string().max(10000);
export const diaryEntrySchema = z.object({
  id: z.string().min(1).max(160), date: dateKey, createdAt: timestamp,
  updatedAt: timestamp.optional(),
  photos: z.array(z.object({
    mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    base64: z.string().min(4).max(8 * 1024 * 1024).regex(/^[A-Za-z0-9+/]+={0,2}$/),
  }).refine(photo => {
    const signatures = { 'image/jpeg': '/9j/', 'image/png': 'iVBORw0KGgo', 'image/webp': 'UklGR', 'image/gif': 'R0lGOD' };
    return photo.base64.startsWith(signatures[photo.mediaType]);
  })).max(12),
  title: text.optional(), weather: text.optional(), temperature: z.number().finite().optional(),
  mood: text.optional(), items: z.array(z.object({ category: text, name: text })).max(100).optional(),
  colors: z.array(text).max(100).optional(), styleNote: text.optional(), memo: text.optional(),
  tags: z.array(text).max(100).default([]),
});
export const diaryEntriesSchema = z.array(diaryEntrySchema).max(5000);
const backupSchema = z.object({ format: z.literal('loodi-diary'), version: z.literal(1), exportedAt: timestamp, entries: diaryEntriesSchema });

export function serializeDiaryBackup(entries: DiaryEntry[]) {
  return JSON.stringify({ format: 'loodi-diary', version: 1, exportedAt: new Date().toISOString(), entries: diaryEntriesSchema.parse(entries) });
}

export function parseDiaryBackup(raw: string): DiaryEntry[] {
  if (new Blob([raw]).size > MAX_BACKUP_BYTES) throw new Error('백업 파일은 20MB 이하로 선택해 주세요.');
  try { return backupSchema.parse(JSON.parse(raw)).entries; }
  catch { throw new Error('올바른 LOODI 백업 파일이 아니에요. 기존 기록은 변경하지 않았어요.'); }
}

/** Existing records always win: restoring a backup never replaces edits. */
export function mergeDiaryBackup(existing: DiaryEntry[], incoming: DiaryEntry[]) {
  const entries = new Map(existing.map(entry => [entry.id, entry]));
  for (const entry of incoming) if (!entries.has(entry.id)) entries.set(entry.id, entry);
  return [...entries.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
