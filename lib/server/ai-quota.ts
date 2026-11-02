import { randomUUID } from 'node:crypto';
import { RequestError } from './request-validation';

// Redis executes admission atomically across all server instances. Active leases
// expire after the route's maximum lifetime, including when a worker crashes.
export const ADMIT_SCRIPT = `
local now = tonumber(redis.call('TIME')[1])
local user = KEYS[1]
local global = KEYS[2]
redis.call('ZREMRANGEBYSCORE', user, '-inf', now)
redis.call('ZREMRANGEBYSCORE', global, '-inf', now)
local counters = {KEYS[3], KEYS[4], KEYS[5]}
local limits = {6, 60, tonumber(ARGV[2])}
for i,k in ipairs(counters) do
  if tonumber(redis.call('GET', k) or '0') >= limits[i] then return 0 end
end
if redis.call('ZCARD', user) >= 2 or redis.call('ZCARD', global) >= 20 then return 0 end
for i,k in ipairs(counters) do
  redis.call('INCR', k)
  if i == 1 then redis.call('EXPIRE', k, 60) else redis.call('EXPIRE', k, 86400) end
end
redis.call('ZADD', user, now + 90, ARGV[1])
redis.call('ZADD', global, now + 90, ARGV[1])
redis.call('EXPIRE', user, 100)
redis.call('EXPIRE', global, 100)
return 1`;
async function redis(command: (string | number)[]) {
  const endpoint = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!endpoint || !token || !endpoint.startsWith('https://')) throw new RequestError('AI 사용량 제한 서버 설정이 필요합니다.', 503);
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command), signal: AbortSignal.timeout(5000), cache: 'no-store' });
    if (!response.ok) throw new Error('Redis unavailable');
    const data = await response.json();
    if (data.error) throw new Error('Redis command failed');
    return data.result;
  } catch { throw new RequestError('AI 사용량 제한 서버에 연결할 수 없습니다.', 503); }
}
export async function acquireAiQuota(userId: string): Promise<() => Promise<void>> {
  const id = randomUUID();
  const prefix = 'loodi:{ai}';
  const user = `${prefix}:active:${userId}`;
  const global = `${prefix}:active`;
  const day = Math.floor(Date.now() / 86400000);
  const minute = Math.floor(Date.now() / 60000);
  const limit = Number(process.env.AI_GLOBAL_DAILY_LIMIT || 1000);
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RequestError('AI 한도 설정이 올바르지 않습니다.', 503);
  const result = await redis(['EVAL', ADMIT_SCRIPT, 5, user, global, `${prefix}:minute:${userId}:${minute}`, `${prefix}:day:${userId}:${day}`, `${prefix}:day:${day}`, id, limit]);
  if (result !== 1) throw new RequestError('AI 사용량 한도에 도달했어요. 잠시 후 다시 시도해 주세요.', 429);
  return async () => { await redis(['EVAL', "redis.call('ZREM', KEYS[1], ARGV[1]); redis.call('ZREM', KEYS[2], ARGV[1]); return 1", 2, user, global, id]); };
}
