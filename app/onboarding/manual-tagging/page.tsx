"use client";

import { LinkButton } from "@/components/ui/link-button";


export default function ManualTaggingFallbackPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-white px-4 py-8">
      <div className="space-y-5">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            분석 없이 기록할까요?
          </h1>
          <p className="text-sm leading-relaxed text-primary/70">
            분석이 지연되고 있어요. 선택한 사진과 메모를 먼저 저장하고
            기록을 이어갈 수 있어요.
          </p>
        </header>

        <div className="rounded-2xl border border-border p-4 text-sm text-primary/75">
          다음 화면에서 사진을 확인하고 메모를 남길 수 있어요.
        </div>

        <LinkButton href="/onboarding/result" className="h-11 w-full">사진과 메모 기록하기</LinkButton>
      </div>
    </main>
  );
}
