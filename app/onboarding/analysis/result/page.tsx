"use client";

"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { writeOnboardingLocalState } from "@/lib/onboarding-persistence";

const styleRatios = [
  { label: "Minimal", value: 46 },
  { label: "Classic", value: 29 },
  { label: "Street", value: 15 },
  { label: "Romantic", value: 10 },
];

const itemTags = [
  "Single Blazer",
  "Wide Slacks",
  "Leather Belt",
  "Loafers",
  "Structured Tote",
];

const palette = ["#1F2430", "#6D5C4A", "#C3B8AA", "#F1EFEA"];

export default function AnalysisResultPage() {
  useEffect(() => {
    writeOnboardingLocalState({ lastStep: "analysis_result", completed: false });
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-white px-4 pb-28 pt-8">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            AI style analysis result
          </h1>
          <p className="text-sm text-primary/70">
            첫 룩 분석이 완료되었습니다. 아래 요약을 다이어리에 저장할 수 있어요.
          </p>
        </header>

        <section className="space-y-3 rounded-2xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/50">
            Style Category Ratio
          </p>
          {styleRatios.map((ratio) => (
            <div key={ratio.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-primary/75">
                <span>{ratio.label}</span>
                <span>{ratio.value}%</span>
              </div>
              <div className="h-2 rounded-full bg-soft">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${ratio.value}%` }}
                />
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3 rounded-2xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/50">
            Detected Item Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {itemTags.map((tag) => (
              <span key={tag} className="rounded-full border border-border px-3 py-1 text-xs text-primary/80">
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/50">
            Color Palette
          </p>
          <div className="flex gap-2">
            {palette.map((hex) => (
              <div key={hex} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1">
                <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: hex }} />
                <span className="text-[11px] text-primary/70">{hex}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/50">
            Silhouette Result
          </p>
          <p className="text-sm font-medium text-primary">
            Relaxed Straight + Defined Shoulder
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/50">
            AI Style Note
          </p>
          <p className="text-sm leading-relaxed text-primary/75">
            클래식 테일러링을 기반으로 실루엣은 여유 있고 정돈되어 있습니다.
            다음 기록에서는 텍스처 대비를 한 단계 높이면 스타일 아이덴티티가 더
            선명해질 가능성이 높아요.
          </p>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-md">
          <Link href="/onboarding/result">
            <Button className="h-11 w-full">다이어리에 기록하기</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
