import { createClient } from "@supabase/supabase-js";

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
    process.env.NEXT_PUBLIC_ALLOWED_EMAILS ?? process.env.ALLOWED_EMAILS,
  );
  if (allowed.size === 0) return true;
  return email ? allowed.has(email.trim().toLowerCase()) : false;
}

export async function requireAllowedApiUser(request: Request) {
  const allowed = parseAllowedEmails(process.env.ALLOWED_EMAILS);
  if (allowed.size === 0) return { ok: true as const };

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return {
      ok: false as const,
      status: 401,
      error: "로그인이 필요합니다.",
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false as const,
      status: 500,
      error: "접근 제어 설정이 완료되지 않았습니다.",
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.getUser(token);
  const email = data.user?.email?.trim().toLowerCase();

  if (error || !email) {
    return {
      ok: false as const,
      status: 401,
      error: "로그인이 필요합니다.",
    };
  }

  if (!allowed.has(email)) {
    return {
      ok: false as const,
      status: 403,
      error: "접근 권한이 없습니다.",
    };
  }

  return { ok: true as const, email };
}
