import { cp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());
const origin = new URL(process.env.NEXT_PUBLIC_API_ORIGIN || 'http://invalid.local');
if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
  throw new Error('Set NEXT_PUBLIC_API_ORIGIN to the HTTPS origin of your deployed Next.js API server.');
}
const stage = '.mobile-build';
await rm(stage, { recursive: true, force: true });
await mkdir(stage);
for (const name of ['app', 'components', 'hooks', 'lib', 'public', 'tsconfig.json', 'next-env.d.ts', 'tailwind.config.ts', 'postcss.config.mjs', 'package.json']) {
  await cp(name, `${stage}/${name}`, { recursive: true });
}
await rm(`${stage}/app/api`, { recursive: true });
await symlink('../node_modules', `${stage}/node_modules`, 'dir');
await writeFile(`${stage}/next.config.mjs`, 'export default { output: "export", trailingSlash: true, images: { unoptimized: true } };\n');
const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build', stage], {
  stdio: 'inherit', env: { ...process.env, NEXT_PUBLIC_NATIVE_APP: 'true' },
});
if (result.status !== 0) process.exit(result.status || 1);
await rm('mobile/dist', { recursive: true, force: true });
await cp(`${stage}/out`, 'mobile/dist', { recursive: true });
console.log('Bundled mobile UI ready in mobile/dist. Server routes remain on your HTTPS backend.');
