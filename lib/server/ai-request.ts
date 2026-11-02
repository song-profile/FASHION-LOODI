import 'server-only';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { requireAllowedApiUser } from './auth';
import { acquireAiQuota } from './ai-quota';
import { readValidatedJson, RequestError } from './request-validation';

export async function withAiRequest<T>(request: Request, schema: z.ZodType<T>, handler: (body: T) => Promise<Response>) {
  let release: (() => Promise<void>) | undefined;
  try {
    const access = await requireAllowedApiUser(request);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    // Reserve before reading the body so malformed requests are limited too.
    release = await acquireAiQuota(access.userId);
    const body = await readValidatedJson(request, schema);
    return await handler(body);
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 500;
    return NextResponse.json({ error: error instanceof RequestError ? error.message : '요청을 처리하지 못했어요.' }, { status, headers: status === 429 ? { 'Retry-After': '60' } : undefined });
  } finally {
    if (release) await release().catch(() => { /* Lease expires on Redis after 90 seconds. */ });
  }
}
