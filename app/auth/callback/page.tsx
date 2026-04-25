"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { supabase } from "@/lib/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const completeLogin = async () => {
      const nextPath = searchParams.get("next") ?? "/home";

      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (error) {
        router.replace("/");
        return;
      }

      const { data } = await supabase.auth.getUser();
      const metadata = data.user?.user_metadata ?? {};
      const hasProfile =
        typeof metadata.full_name === "string" &&
        metadata.full_name.trim().length > 0 &&
        typeof metadata.gender === "string" &&
        metadata.gender.trim().length > 0 &&
        typeof metadata.birth_date === "string" &&
        metadata.birth_date.trim().length > 0;

      router.replace(
        hasProfile
          ? nextPath
          : `/profile/setup?next=${encodeURIComponent(nextPath)}`
      );
    };

    completeLogin();
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <p className="text-sm font-medium text-primary/70">로그인 처리 중...</p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white px-4">
          <p className="text-sm font-medium text-primary/70">
            로그인 처리 중...
          </p>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
