import type { Page } from '@playwright/test';
import * as nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co').hostname.split('.')[0];
export async function signedIn(page: Page, onboarding = true) {
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'preview@loodi.test', app_metadata: { provider: 'email' }, user_metadata: { nickname: '수빈', full_name: '김수빈', gender: '선택 안 함', birth_date: '2000-01-01', onboarding_completed: onboarding }, created_at: new Date().toISOString() };
  const payload = Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
  const session = { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.preview`, refresh_token: 'ui-test-only', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user };
  await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: `sb-${project}-auth-token`, session });
  // UI fixtures only: no real account, billable AI call or remote auth request.
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.pathname.startsWith('/auth/v1/')) return route.fulfill({ json: user });
    if (url.hostname === 'api.open-meteo.com') return route.fulfill({ json: { current: { weather_code: 0, temperature_2m: 21 } } });
    if (url.hostname === 'ipapi.co') return route.fulfill({ json: { latitude: 37.5, longitude: 127, city: '서울' } });
    return route.abort();
  });
}

