import { z } from 'zod';
import { diaryEntrySchema } from './diary-backup';

export const RECORD_DRAFT_KEY = 'loodi_record_draft_v1';
export const recordDraftSchema = z.object({
  version: z.literal(1), photo: diaryEntrySchema.shape.photos.element, date: diaryEntrySchema.shape.date,
  title: z.string().max(100), memo: z.string().max(2000), tags: z.string().max(500), colors: z.string().max(500),
  weather: z.enum(['☀️', '☁️', '🌧️', '❄️']), temperature: z.number().min(-15).max(45),
  mood: z.enum(['🙂', '😊', '😎', '😴']), step: z.number().int().min(1).max(3),
  analysis: z.object({
    items: z.array(z.object({ category: z.string(), name: z.string() })).max(100),
    colors: z.array(z.string()).max(100), style: z.array(z.string()).max(100),
    season: z.string(), mood: z.array(z.string()).max(100), description: z.string().max(10000),
  }).nullable(),
});
