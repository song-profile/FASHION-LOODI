function parseAllowedEmails(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isEmailAllowed(email: string | null | undefined) {
  const allowed = parseAllowedEmails(
    process.env.NEXT_PUBLIC_ALLOWED_EMAILS,
  );
  if (allowed.size === 0) return true;
  return email ? allowed.has(email.trim().toLowerCase()) : false;
}
