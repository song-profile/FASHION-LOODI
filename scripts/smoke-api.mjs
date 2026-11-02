import nextEnv from '@next/env';
import { httpsOrigin, checkApiBoundary } from './release-config.mjs';

nextEnv.loadEnvConfig(process.cwd());
const args = process.argv.slice(2);
const local = args.includes('--local');
const origin = local ? 'http://127.0.0.1:3000' : process.env.NEXT_PUBLIC_API_ORIGIN;
if (!local && !httpsOrigin(origin)) throw new Error('실제 NEXT_PUBLIC_API_ORIGIN을 설정하거나 로컬 검증에 --local을 사용하세요.');
const issues = await checkApiBoundary(origin);
if (issues.length) {
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else console.log('4개 API의 미인증 차단과 iOS CORS 검사 통과. AI 호출과 계정 삭제는 실행하지 않았습니다.');
