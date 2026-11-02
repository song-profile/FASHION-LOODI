import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkReleaseConfig, httpsOrigin, checkApiBoundary } from '../scripts/release-config.mjs';

test('release config rejects placeholder origins, public secrets and mismatched invites without printing values', () => {
  assert.equal(httpsOrigin('https://example.com'), false);
  assert.equal(httpsOrigin('https://user:password@api.loodi.test'), false);
  assert.equal(httpsOrigin('https://api.loodi.test/path'), false);
  assert.equal(httpsOrigin('https://api.loodi.test'), true);
  const issues = checkReleaseConfig({ NEXT_PUBLIC_SERVICE_ROLE_KEY: 'do-not-print-this', ALLOWED_EMAILS: 'a@test' });
  assert(issues.some(v => v.includes('NEXT_PUBLIC_SERVICE_ROLE_KEY')));
  assert(issues.some(v => v.includes('초대 목록')));
  assert(!issues.join().includes('do-not-print-this'));
});
test('API smoke checks reject broken auth and missing CORS headers', async () => {
  const broken = await checkApiBoundary('https://api.loodi.test', async () => new Response('{}', { status: 200 }));
  assert(broken.some(v => v.includes('401')));
  assert(broken.some(v => v.includes('CORS')));
  const calls = [];
  const passing = await checkApiBoundary('https://api.loodi.test', async (_url, init) => {
    calls.push(init);
    return new Response(null, { status: init.method === 'OPTIONS' ? 204 : 401, headers: { 'Access-Control-Allow-Origin': 'capacitor://localhost', 'Access-Control-Allow-Methods': 'POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'authorization,content-type' } });
  });
  assert.deepEqual(passing, []);
  assert.equal(calls.length, 8);
  assert(calls.every(v => !v.headers.Authorization && v.redirect === 'error'));
});
