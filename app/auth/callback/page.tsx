"use client";

import { postLoginPath } from "@/lib/auth-routing";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { isEmailAllowed } from "@/lib/access-control";
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
      if (!isEmailAllowed(data.user?.email)) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }
      const metadata = data.user?.user_metadata ?? {};
      router.replace(postLoginPath(metadata, nextPath));
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
