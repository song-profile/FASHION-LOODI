import { z } from 'zod';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const mediaType = z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const base64 = z.string().refine(value =>
  value.length >= 4 && value.length <= 4 * Math.ceil(MAX_IMAGE_BYTES / 3) &&
  value.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(value), 'Invalid base64');
function validImage(data: string, type: string) {
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length > MAX_IMAGE_BYTES) return false;
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (type === 'image/gif') return ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString());
  return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
}
const photo = z.object({ base64, mediaType }).refine(v => validImage(v.base64, v.mediaType), 'Invalid image signature');
export const analysisSchema = z.object({ image: base64, mediaType }).refine(v => validImage(v.image, v.mediaType), 'Invalid image signature');
const short = z.string().max(100);
export const recommendationSchema = z.object({
  gender: short.optional(),
  weather: z.object({ label: short.optional(), temperature: z.number().finite().min(-100).max(100).optional() }).nullable().optional(),
  recentEntries: z.array(z.object({
    date: short.optional(), colors: z.array(short).max(20).optional(),
    items: z.array(z.object({ category: short, name: short })).max(30).optional(),
    styleNote: z.string().max(2000).optional(), mood: short.optional(), weather: short.optional(),
  })).max(10).optional(),
  todayPhoto: photo.nullable().optional(),
});
export const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(2000) })).min(1).max(20),
}).refine(v => v.messages.at(-1)?.role === 'user', 'Last message must be from user');

export class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function readValidatedJson<T>(request: Request, schema: z.ZodType<T>, maxBytes = 7 * 1024 * 1024): Promise<T> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new RequestError('JSON 요청이 필요합니다.', 415);
  if (Number(request.headers.get('content-length')) > maxBytes) throw new RequestError('요청이 너무 큽니다.', 413);
  if (!request.body) throw new RequestError('요청 본문이 필요합니다.', 400);
  const reader = request.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new RequestError('요청이 너무 큽니다.', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let raw: unknown;
  try { raw = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new RequestError('올바른 JSON이 필요합니다.', 400); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new RequestError('요청 형식 또는 크기가 올바르지 않습니다.', 400);
  return parsed.data;
}
