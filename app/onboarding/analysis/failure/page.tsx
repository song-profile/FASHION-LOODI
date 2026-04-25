"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getAnalysisRetryCount } from "@/lib/onboarding-analysis-session";

export default function AnalysisFailurePage() {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const failures = getAnalysisRetryCount();
    setCount(failures);
    if (failures >= 3) {
      router.replace("/onboarding/manual-tagging");
    }
  }, [router]);

  const remain = Math.max(0, 3 - count);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-white px-4 py-8">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            분석을 완료하지 못했어요
          </h1>
          <p className="text-sm leading-relaxed text-primary/70">
            네트워크 상태 또는 이미지 품질 때문에 결과 생성이 지연되었습니다.
            다시 시도하면 대부분 정상적으로 완료돼요.
          </p>
        </header>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-soft p-4"
        >
          <p className="text-sm text-primary">
            남은 재시도 횟수: <span className="font-semibold">{remain}</span> / 3
          </p>
          <p className="mt-2 text-xs text-primary/60">
            3회 연속 실패 시 수동 태깅 화면으로 자동 이동합니다.
          </p>
        </motion.section>

        <div className="space-y-3">
          <Button className="h-11 w-full" onClick={() => router.push("/onboarding/analysis/loading")}>
            다시 분석하기
          </Button>
          <Button variant="outline" className="h-11 w-full" onClick={() => router.push("/onboarding/manual-tagging")}>
            수동으로 태깅하기
          </Button>
        </div>
      </div>
    </main>
  );
}
