"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { isEmailAllowed } from "@/lib/access-control";
import { supabase } from "@/lib/supabase";
import { clearCurrentUserStorageId } from "@/lib/user-storage";

export function AccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(
    "checking",
  );

  useEffect(() => {
    const checkAccess = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.replace("/");
        return;
      }

      if (!isEmailAllowed(user.email)) {
        await supabase.auth.signOut();
        clearCurrentUserStorageId();
        setStatus("denied");
        return;
      }

      setStatus("allowed");
    };

    checkAccess();
  }, [router]);

  if (status === "allowed") return <>{children}</>;

  if (status === "denied") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="space-y-2">
          <p className="text-xl font-semibold text-primary">접근 권한이 없어요</p>
          <p className="text-sm leading-6 text-primary/60">
            이 서비스는 초대받은 이메일 계정만 사용할 수 있습니다.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.replace("/")}>
          메인으로 돌아가기
        </Button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="text-sm font-medium text-primary/60">
        접근 권한을 확인하는 중...
      </p>
    </main>
  );
}
