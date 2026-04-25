"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { OnboardingProgress } from "@/components/sections/onboarding-progress";
import {
  incrementAnalysisRetryCount,
  resetAnalysisRetryCount,
} from "@/lib/onboarding-analysis-session";
import {
  aggregate,
  clearPendingImages,
  readPendingImages,
  setAnalysisResult,
  type SingleAnalysis,
} from "@/lib/onboarding-analysis-images";
import { writeOnboardingLocalState } from "@/lib/onboarding-persistence";
import { cn } from "@/lib/utils";

type StageStatus = "waiting" | "analyzing" | "completed";

const stageLabels = [
  "Image quality check",
  "Garment detection",
  "Style DNA matching",
  "Diary-ready summary",
];

export default function AnalysisLoadingPage() {
  const router = useRouter();
  const [statuses, setStatuses] = useState<StageStatus[]>(
    stageLabels.map((_, idx) => (idx === 0 ? "analyzing" : "waiting")),
  );
  const [showReassure, setShowReassure] = useState(false);

  const allCompleted = useMemo(
    () => statuses.every((status) => status === "completed"),
    [statuses],
  );

  useEffect(() => {
    writeOnboardingLocalState({ lastStep: "analysis_loading", completed: false });
  }, []);

  useEffect(() => {
    const reassureTimer = window.setTimeout(() => setShowReassure(true), 5500);
    return () => window.clearTimeout(reassureTimer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const handleFailure = () => {
      const nextFailures = incrementAnalysisRetryCount();
      if (nextFailures >= 3) {
        router.replace("/onboarding/manual-tagging");
      } else {
        router.replace("/onboarding/analysis/failure");
      }
    };

    const advance = (idx: number) => {
      if (cancelled) return;
      setStatuses((prev) => {
        const next = [...prev];
        for (let i = 0; i <= idx; i += 1) next[i] = "completed";
        if (idx + 1 < next.length) next[idx + 1] = "analyzing";
        return next;
      });
    };

    const run = async () => {
      const images = readPendingImages();
      if (images.length === 0) {
        router.replace("/onboarding/upload");
        return;
      }

      // Stage 0: image quality check (instant pass — file types validated upstream)
      await new Promise((r) => setTimeout(r, 350));
      if (cancelled) return;
      advance(0);

      // Stage 1 & 2: real Gemini calls per image
      const perImage: SingleAnalysis[] = [];
      try {
        for (const img of images) {
          const res = await fetch("/api/analyze-outfit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: img.base64, mediaType: img.mediaType }),
          });
          if (!res.ok) {
            const { error: msg } = await res
              .json()
              .catch(() => ({ error: `HTTP ${res.status}` }));
            throw new Error(msg || `HTTP ${res.status}`);
          }
          const data: SingleAnalysis = await res.json();
          perImage.push(data);
          if (cancelled) return;
        }
      } catch (err) {
        console.error("AI analysis failed", err);
        if (!cancelled) handleFailure();
        return;
      }

      if (cancelled) return;
      advance(1);

      // Stage 3: aggregation
      await new Promise((r) => setTimeout(r, 350));
      if (cancelled) return;
      const aggregated = aggregate(perImage);
      setAnalysisResult(aggregated);
      clearPendingImages();
      advance(2);

      // Stage 4: brief settle before navigation
      await new Promise((r) => setTimeout(r, 500));
      if (cancelled) return;
      advance(3);

      resetAnalysisRetryCount();
      await new Promise((r) => setTimeout(r, 300));
      if (cancelled) return;
      router.replace("/onboarding/analysis/result");
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-white px-4 py-8">
      <div className="space-y-6">
        <OnboardingProgress step={5} total={6} />

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            AI가 스타일을 분석하고 있어요
          </h1>
          <p className="text-sm text-primary/70">
            룩의 분위기와 아이템 구성을 안정적으로 정리 중입니다.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-white p-6">
          <div className="flex justify-center">
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="relative flex h-24 w-24 items-center justify-center rounded-full border border-primary/20 bg-primary/5"
            >
              <span className="text-2xl font-semibold text-primary">DNA</span>
              <motion.div
                className="absolute inset-0 rounded-full border border-primary/25"
                animate={{ scale: [1, 1.3], opacity: [0.35, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
            </motion.div>
          </div>

          <div className="mt-6 space-y-3">
            {stageLabels.map((label, idx) => {
              const status = statuses[idx];
              return (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2"
                >
                  <p className="text-sm text-primary">{label}</p>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      status === "completed" && "text-emerald-600",
                      status === "analyzing" && "text-primary",
                      status === "waiting" && "text-primary/45",
                    )}
                  >
                    {status === "waiting"
                      ? "Waiting"
                      : status === "analyzing"
                        ? "Analyzing"
                        : "Completed"}
                  </span>
                </div>
              );
            })}
          </div>

          {showReassure && !allCompleted ? (
            <p className="mt-5 rounded-xl bg-soft px-3 py-2 text-xs leading-relaxed text-primary/70">
              결과 정확도를 위해 조금 더 꼼꼼히 확인하고 있어요. 잠시만 기다려 주세요.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
