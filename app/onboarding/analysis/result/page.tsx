"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  readAnalysisResult,
  type AggregatedAnalysis,
} from "@/lib/onboarding-analysis-images";
import { writeOnboardingLocalState } from "@/lib/onboarding-persistence";

const FALLBACK_RATIOS = [
  { label: "Minimal", value: 46 },
  { label: "Classic", value: 29 },
  { label: "Street", value: 15 },
  { label: "Romantic", value: 10 },
];

const FALLBACK_ITEMS = [
  "Single Blazer",
  "Wide Slacks",
  "Leather Belt",
  "Loafers",
  "Structured Tote",
];

const FALLBACK_PALETTE = [
  { label: "Charcoal", hex: "#1F2430" },
  { label: "Walnut", hex: "#6D5C4A" },
  { label: "Stone", hex: "#C3B8AA" },
  { label: "Ivory", hex: "#F1EFEA" },
];

const FALLBACK_SILHOUETTE = "Relaxed Straight + Defined Shoulder";

const FALLBACK_NOTE =
  "클래식 테일러링을 기반으로 실루엣은 여유 있고 정돈되어 있습니다. 다음 기록에서는 텍스처 대비를 한 단계 높이면 스타일 아이덴티티가 더 선명해질 가능성이 높아요.";

function buildRatios(result: AggregatedAnalysis) {
  const total = Object.values(result.styleCounts).reduce((s, n) => s + n, 0);
  if (total === 0) return [];
  return Object.entries(result.styleCounts)
    .map(([label, count]) => ({ label, value: Math.round((count / total) * 100) }))
    .sort((a, b) => b.value - a.value);
}

export default function AnalysisResultPage() {
  const [result, setResult] = useState<AggregatedAnalysis | null>(null);

  useEffect(() => {
    writeOnboardingLocalState({ lastStep: "analysis_result", completed: false });
    setResult(readAnalysisResult());
  }, []);

  const ratios = result ? buildRatios(result) : [];
  const itemTags = result ? result.items.map((it) => it.name).slice(0, 8) : [];
  const colorTags = result ? result.colors : [];
  const silhouette = result
    ? [result.seasons.join(" · "), result.moods.slice(0, 2).join(", ")]
        .filter(Boolean)
        .join(" / ")
    : "";
  const note = result?.notes.join("\n\n") ?? "";

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
          {(ratios.length > 0 ? ratios : FALLBACK_RATIOS).map((ratio) => (
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
            {(itemTags.length > 0 ? itemTags : FALLBACK_ITEMS).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border px-3 py-1 text-xs text-primary/80"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/50">
            Color Palette
          </p>
          {colorTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {colorTags.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-border px-3 py-1 text-xs text-primary/80"
                >
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              {FALLBACK_PALETTE.map((p) => (
                <div
                  key={p.hex}
                  className="flex items-center gap-2 rounded-lg border border-border px-2 py-1"
                >
                  <span
                    className="h-5 w-5 rounded-full border border-black/10"
                    style={{ backgroundColor: p.hex }}
                  />
                  <span className="text-[11px] text-primary/70">{p.hex}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/50">
            Silhouette Result
          </p>
          <p className="text-sm font-medium text-primary">
            {silhouette || FALLBACK_SILHOUETTE}
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/50">
            AI Style Note
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-primary/75">
            {note || FALLBACK_NOTE}
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
