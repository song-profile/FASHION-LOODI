import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNextPath, postLoginPath } from '../lib/auth-routing';
import { trustedApiTarget } from '../lib/api-target';
import { analysisSchema, chatSchema, recommendationSchema, readValidatedJson, RequestError } from '../lib/server/request-validation';
import { acquireAiQuota } from '../lib/server/ai-quota';
import { setCurrentUserStorageId, scopedLocalStorageKey, clearCurrentUserStorageId, deleteUserLocalData } from '../lib/user-storage';

const profile = { nickname: 'a', full_name: 'b', gender: '선택 안 함', birth_date: '2000-01-01', onboarding_completed: true };
test('redirects allow only known internal destinations', () => {
  for (const path of ['javascript:alert(1)', 'https://evil.test', '//evil.test', '/\\evil.test', '/home?next=https://evil.test', '%2Fhome', '/unknown']) assert.equal(safeNextPath(path), '/home');
  assert.equal(safeNextPath('/closet'), '/closet');
  assert.equal(postLoginPath(profile, '/closet'), '/closet');
  assert.equal(postLoginPath({ ...profile, onboarding_completed: false }), '/onboarding/style');
  assert.match(postLoginPath({}), /^\/profile\/setup\?/);
});
test('credentials can only target own API origin and path', () => {
  const origin = 'https://api.loodi.test';
  assert.equal(trustedApiTarget('/api/account', origin).href, `${origin}/api/account`);
  for (const value of ['https://evil.test/api/account', '//evil.test/api/account', 'http://api.loodi.test/api/account', 'https://user@api.loodi.test/api/account', '/home', '/api/../../home']) assert.throws(() => trustedApiTarget(value, origin));
  assert.throws(() => trustedApiTarget(new Request(`${origin}/api/account`), origin));
});
test('untrusted JSON, oversized images, mismatched image MIME types and malformed chat are rejected', () => {
  for (const value of [null, {}, { messages: [null] }, { messages: [{ role: 'system', content: 'x' }] }, { messages: [{ role: 'user', content: 'x'.repeat(2001) }] }, { messages: Array(21).fill({ role: 'user', content: 'x' }) }]) assert.equal(chatSchema.safeParse(value).success, false);
  assert.equal(chatSchema.safeParse({ messages: [{ role: 'user', content: '문의' }] }).success, true);
  assert.equal(analysisSchema.safeParse({ image: Buffer.from('not an image').toString('base64'), mediaType: 'image/jpeg' }).success, false);
  assert.equal(analysisSchema.safeParse({ image: Buffer.from([255,216,255,224]).toString('base64'), mediaType: 'image/jpeg' }).success, true);
  assert.equal(analysisSchema.safeParse({ image: 'a'.repeat(8 * 1024 * 1024), mediaType: 'image/jpeg' }).success, false);
  assert.equal(recommendationSchema.safeParse({ recentEntries: [null] }).success, false);
  assert.equal(recommendationSchema.safeParse({ weather: { temperature: Infinity } }).success, false);
  assert.equal(recommendationSchema.safeParse({ recentEntries: [] }).success, true);
});
test('streamed body limits do not trust Content-Length', async () => {
  const req = new Request('https://loodi.test/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }) });
  await assert.rejects(readValidatedJson(req, chatSchema, 10), (e: unknown) => e instanceof RequestError && e.status === 413);
  const bad = new Request('https://loodi.test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'null' });
  await assert.rejects(readValidatedJson(bad, chatSchema), (e: unknown) => e instanceof RequestError && e.status === 400);
});
test('quota fails closed when unavailable, denies exhausted quota and releases leases', async () => {
  const savedFetch = globalThis.fetch;
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    delete process.env.UPSTASH_REDIS_REST_URL;
    await assert.rejects(acquireAiQuota('user'), (e: unknown) => e instanceof RequestError && e.status === 503);
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test'; process.env.UPSTASH_REDIS_REST_TOKEN = 'test';
    globalThis.fetch = async () => Response.json({ result: 0 });
    await assert.rejects(acquireAiQuota('user'), (e: unknown) => e instanceof RequestError && e.status === 429);
    const commands: unknown[][] = [];
    globalThis.fetch = async (_url, init) => { commands.push(JSON.parse(String(init?.body))); return Response.json({ result: 1 }); };
    const release = await acquireAiQuota('user'); await release();
    assert.equal(commands.length, 2); assert.equal(commands[0][0], 'EVAL'); assert.equal(commands[0][2], 5); assert.equal(commands[1][2], 2);
    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(acquireAiQuota('user'), (e: unknown) => e instanceof RequestError && e.status === 503);
  } finally {
    globalThis.fetch = savedFetch;
    if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  }
});
class MemoryStorage {
  getItem(key: string) { return Object.hasOwn(this, key) ? String((this as Record<string, unknown>)[key]) : null; }
  setItem(key: string, value: string) { Object.defineProperty(this, key, { value, writable: true, configurable: true, enumerable: true }); }
  removeItem(key: string) { delete (this as Record<string, unknown>)[key]; }
}
test('account switches clear temporary data, preserve other diaries, and do not reuse consent or recommendations', () => {
  const localStorage = new MemoryStorage(); const sessionStorage = new MemoryStorage();
  Object.defineProperty(globalThis, 'window', { value: { localStorage, sessionStorage }, configurable: true });
  try {
    localStorage.setItem('loodi_analysis_result', 'legacy');
    setCurrentUserStorageId('alice');
    assert.equal(localStorage.getItem('loodi_analysis_result'), null);
    localStorage.setItem(scopedLocalStorageKey('loodi_outfit_diary'), 'alice diary');
    localStorage.setItem(scopedLocalStorageKey('loodi_ai_consent_v2'), 'true');
    localStorage.setItem(scopedLocalStorageKey('loodi_today_outfit_recommendation'), 'private cache');
    sessionStorage.setItem(scopedLocalStorageKey('loodi_analysis_result'), 'private photo');
    setCurrentUserStorageId('bob');
    assert.equal(sessionStorage.getItem('loodi_analysis_result:alice'), null);
    assert.equal(localStorage.getItem('loodi_today_outfit_recommendation:alice'), null);
    assert.equal(localStorage.getItem(scopedLocalStorageKey('loodi_ai_consent_v2')), null);
    localStorage.setItem(scopedLocalStorageKey('loodi_outfit_diary'), 'bob diary');
    deleteUserLocalData('bob');
    assert.equal(localStorage.getItem('loodi_outfit_diary:bob'), null);
    assert.equal(localStorage.getItem('loodi_outfit_diary:alice'), 'alice diary');
    clearCurrentUserStorageId();
  } finally { Reflect.deleteProperty(globalThis, 'window'); }
});
