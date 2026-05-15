"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { setCurrentUserStorageId } from "@/lib/user-storage";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const completeLogin = async () => {
      const nextPath = searchParams.get("next") ?? "/home";
      const code = searchParams.get("code");

      if (!code) {
        router.replace("/");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        router.replace("/");
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (data.user) setCurrentUserStorageId(data.user.id);
      const metadata = data.user?.user_metadata ?? {};
      const completedOnboarding = metadata.onboarding_completed === true;
      const hasProfile =
        typeof metadata.full_name === "string" &&
        metadata.full_name.trim().length > 0 &&
        typeof metadata.gender === "string" &&
        metadata.gender.trim().length > 0 &&
        typeof metadata.birth_date === "string" &&
        metadata.birth_date.trim().length > 0;

      if (!hasProfile) {
        router.replace(
          `/profile/setup?next=${encodeURIComponent(
            completedOnboarding ? nextPath : "/onboarding/style"
          )}`
        );
        return;
      }

      router.replace(completedOnboarding ? nextPath : "/onboarding/style");
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
