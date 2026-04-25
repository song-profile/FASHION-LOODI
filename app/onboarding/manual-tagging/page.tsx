"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ManualTaggingFallbackPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-white px-4 py-8">
      <div className="space-y-5">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            수동 태깅으로 계속할까요?
          </h1>
          <p className="text-sm leading-relaxed text-primary/70">
            자동 분석이 여러 번 지연되어 수동 입력 모드로 전환했어요. 직접 태깅해도
            다이어리 기록은 동일하게 저장됩니다.
          </p>
        </header>

        <div className="rounded-2xl border border-border p-4 text-sm text-primary/75">
          다음 단계에서 아이템, 컬러, 분위기를 직접 선택해 저장할 수 있습니다.
        </div>

        <Link href="/onboarding/result">
          <Button className="h-11 w-full">수동 태깅 시작</Button>
        </Link>
      </div>
    </main>
  );
}
