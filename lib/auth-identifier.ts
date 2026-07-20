const LOCAL_ID_DOMAIN = "users.loodi.app";

export function identifierToAuthEmail(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  if (normalized.includes("@")) return normalized;
  return `${normalized}@${LOCAL_ID_DOMAIN}`;
}
