import { test, expect } from '@playwright/test';

test('real server routes reject anonymous requests and support the native preflight', async ({ request }) => {
  for (const [route, method] of [['analyze-outfit', 'POST'], ['recommend-outfit', 'POST'], ['contact-chat', 'POST'], ['account', 'DELETE']]) {
    const response = await request.fetch(`/api/${route}`, { method, headers: { 'content-type': 'application/json' }, data: {} });
    expect(response.status(), `${route}: anonymous access`).toBe(401);
    const preflight = await request.fetch(`/api/${route}`, { method: 'OPTIONS', headers: { Origin: 'capacitor://localhost', 'Access-Control-Request-Method': method, 'Access-Control-Request-Headers': 'authorization,content-type' } });
    expect(preflight.ok()).toBe(true);
    expect(preflight.headers()['access-control-allow-origin']).toBe('capacitor://localhost');
    expect(preflight.headers()['access-control-allow-methods']).toContain(method);
  }
});
