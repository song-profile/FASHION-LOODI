const routes = new Set(['/', '/home', '/closet', '/record', '/timeline', '/dna', '/contact', '/onboarding/style', '/onboarding/color', '/onboarding/fit', '/onboarding/upload', '/onboarding/result', '/onboarding/analysis/loading', '/onboarding/analysis/result', '/onboarding/analysis/failure', '/onboarding/manual-tagging']);

export function safeNextPath(value: string | null | undefined): string {
  return value && routes.has(value) ? value : '/home';
}

export function hasCompleteProfile(metadata: Record<string, unknown> | undefined): boolean {
  return ['nickname', 'full_name', 'gender', 'birth_date'].every(key => typeof metadata?.[key] === 'string' && (metadata[key] as string).trim().length > 0);
}

export function postLoginPath(metadata: Record<string, unknown> | undefined, next?: string | null): string {
  const destination = metadata?.onboarding_completed === true ? safeNextPath(next) : '/onboarding/style';
  return hasCompleteProfile(metadata) ? destination : `/profile/setup?next=${encodeURIComponent(destination)}`;
}
