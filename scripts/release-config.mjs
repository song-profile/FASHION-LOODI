export function httpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password && !['example.com', 'example.supabase.co', 'localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) && !url.hostname.endsWith('.example.com');
  } catch { return false; }
}

export function checkReleaseConfig(env) {
  const issues = [];
  for (const key of ['NEXT_PUBLIC_API_ORIGIN', 'NEXT_PUBLIC_SUPABASE_URL', 'UPSTASH_REDIS_REST_URL']) {
    if (!httpsOrigin(env[key])) issues.push(`${key}: 실제 HTTPS origin 설정 필요`);
  }
  for (const key of ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'GEMINI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'UPSTASH_REDIS_REST_TOKEN']) {
    if (!env[key]?.trim() || /^(missing-|your[-_]|placeholder|changeme)/i.test(env[key])) issues.push(`${key}: 실제 키 설정 필요`);
  }
  if (env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY === env.NEXT_PUBLIC_SUPABASE_ANON_KEY) issues.push('Supabase 공개 키와 서비스 역할 키가 같습니다.');
  for (const key of Object.keys(env)) {
    if (/^NEXT_PUBLIC_.*(SERVICE_ROLE|SECRET|PRIVATE_KEY|GEMINI|REDIS.*TOKEN)/i.test(key) && env[key]) issues.push(`${key}: 서버 비밀 키를 NEXT_PUBLIC로 노출하면 안 됩니다.`);
  }
  const limit = Number(env.AI_GLOBAL_DAILY_LIMIT || 1000);
  if (!Number.isSafeInteger(limit) || limit < 1) issues.push('AI_GLOBAL_DAILY_LIMIT: 양의 정수 설정 필요');
  const emails = value => [...new Set((value || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean))].sort().join(',');
  if (emails(env.ALLOWED_EMAILS) !== emails(env.NEXT_PUBLIC_ALLOWED_EMAILS)) issues.push('서버와 앱의 초대 목록 설정이 다릅니다.');
  return issues;
}

export async function checkApiBoundary(origin, fetcher = fetch) {
  const issues = [];
  for (const [path, method] of [['analyze-outfit', 'POST'], ['recommend-outfit', 'POST'], ['contact-chat', 'POST'], ['account', 'DELETE']]) {
    const url = new URL(`/api/${path}`, origin);
    try {
      const preflight = await fetcher(url, { method: 'OPTIONS', headers: { Origin: 'capacitor://localhost', 'Access-Control-Request-Method': method, 'Access-Control-Request-Headers': 'authorization,content-type' }, signal: AbortSignal.timeout(8000), redirect: 'error' });
      const methods = (preflight.headers.get('access-control-allow-methods') || '').toUpperCase().split(',').map(v => v.trim());
      const headers = (preflight.headers.get('access-control-allow-headers') || '').toLowerCase().split(',').map(v => v.trim());
      if (!preflight.ok || preflight.headers.get('access-control-allow-origin') !== 'capacitor://localhost' || !methods.includes(method) || !headers.includes('authorization') || !headers.includes('content-type')) issues.push(`/api/${path}: iOS CORS 사전 요청 실패`);
      const response = await fetcher(url, { method, headers: { Origin: 'capacitor://localhost', 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: '{}' } : {}), signal: AbortSignal.timeout(8000), redirect: 'error' });
      if (response.status !== 401) issues.push(`/api/${path}: 미인증 요청이 401로 차단되지 않음`);
      if (response.headers.get('access-control-allow-origin') !== 'capacitor://localhost') issues.push(`/api/${path}: 오류 응답의 CORS 헤더 누락`);
    } catch { issues.push(`/api/${path}: 연결 또는 리다이렉트 오류`); }
  }
  return issues;
}
