import nextEnv from '@next/env';
import { spawnSync } from 'node:child_process';
import { checkReleaseConfig, httpsOrigin, checkApiBoundary } from './release-config.mjs';

nextEnv.loadEnvConfig(process.cwd());
const issues = checkReleaseConfig(process.env);
if (!process.argv.includes('--server')) {
  const xcode = spawnSync('xcodebuild', ['-version'], { encoding: 'utf8' });
  const major = Number(xcode.stdout?.match(/Xcode (\d+)/)?.[1]);
  if (xcode.status !== 0 || major < 26 || !major) issues.push('Xcode 26 이상 및 iOS SDK 설치 필요');
}
if (process.argv.includes('--online')) {
  if (httpsOrigin(process.env.NEXT_PUBLIC_API_ORIGIN)) issues.push(...await checkApiBoundary(process.env.NEXT_PUBLIC_API_ORIGIN));
  if (httpsOrigin(process.env.UPSTASH_REDIS_REST_URL) && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, { method: 'POST', headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(['PING']), signal: AbortSignal.timeout(8000), redirect: 'error' });
      if (!response.ok || (await response.json()).result !== 'PONG') issues.push('Redis 인증 또는 PING 확인 실패');
    } catch { issues.push('Redis 연결 실패'); }
  }
  if (httpsOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const response = await fetch(new URL('/auth/v1/settings', process.env.NEXT_PUBLIC_SUPABASE_URL), { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }, signal: AbortSignal.timeout(8000), redirect: 'error' });
      if (!response.ok) issues.push('Supabase 공개 키 또는 Auth 연결 확인 실패');
    } catch { issues.push('Supabase Auth 연결 실패'); }
  }
}
if (issues.length) {
  console.error('출시 준비 점검: 미완료');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log('출시 준비 자동 점검 통과. 실기기·서명·개인정보처리방침·스토어 심사 준비는 별도 확인해야 합니다.');
}
