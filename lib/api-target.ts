export function trustedApiTarget(input: RequestInfo | URL, origin: string): URL {
  if (input instanceof Request) throw new Error('API 요청은 경로 또는 URL로 전달해 주세요.');
  const base = new URL(origin);
  const target = new URL(String(input), base);
  if (target.origin !== base.origin || target.protocol !== base.protocol || target.username || target.password || !target.pathname.startsWith('/api/')) {
    throw new Error('허용되지 않은 API 주소입니다.');
  }
  return target;
}
