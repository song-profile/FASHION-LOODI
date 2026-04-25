"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { OnboardingProgress } from "@/components/sections/onboarding-progress";
import {
  clearAnalysisResult,
  clearOutfitPhotos,
  readAnalysisResult,
  readOutfitPhotos,
  toDataUrl,
  type AggregatedAnalysis,
} from "@/lib/onboarding-analysis-images";
import { writeOnboardingLocalState } from "@/lib/onboarding-persistence";
import { appendDiaryEntry, formatDateKey } from "@/lib/outfit-diary";
import { cn } from "@/lib/utils";

const FALLBACK_PHOTOS = [
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1200&q=80",
];

export default function OnboardingResultPage() {
  const router = useRouter();
  const [memo, setMemo] = useState("오늘 룩은 밸런스가 좋아서 만족.");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[] | null>(null);
  const [analysis, setAnalysis] = useState<AggregatedAnalysis | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = readOutfitPhotos();
    if (stored.length > 0) setUploadedPhotos(stored.map(toDataUrl));
    setAnalysis(readAnalysisResult());
  }, []);

  const photos = useMemo(
    () => uploadedPhotos ?? FALLBACK_PHOTOS,
    [uploadedPhotos],
  );

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    []
  );

  const handleScroll = () => {
    const node = scrollerRef.current;
    if (!node) return;
    const index = Math.round(node.scrollLeft / node.clientWidth);
    setActiveSlide(index);
  };

  const handleComplete = () => {
    if (saving) return;
    setSaving(true);
    window.setTimeout(() => {
      const photos = readOutfitPhotos();
      if (photos.length > 0) {
        const tags = analysis
          ? [
              ...analysis.seasons,
              ...analysis.styles.slice(0, 2),
              ...analysis.moods.slice(0, 2),
            ].filter(Boolean)
          : [];
        appendDiaryEntry({
          date: formatDateKey(new Date()),
          photos,
          styleNote: analysis?.notes.join("\n\n"),
          tags,
        });
      }
      writeOnboardingLocalState({ completed: true, lastStep: "completed" });
      clearOutfitPhotos();
      clearAnalysisResult();
      setSaved(true);
      window.setTimeout(() => {
        router.push("/home");
      }, 950);
    }, 650);
  };

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-md bg-white px-4 pb-36 pt-8">
      <div className="space-y-6">
        <OnboardingProgress step={6} total={6} />

        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-primary/50">{today}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-primary">
            첫 번째 기록 완성!
          </h1>
        </header>

        <section className="space-y-3">
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto px-4"
          >
            {photos.map((src, idx) => (
              <div key={src} className="w-full flex-none snap-start pr-3 last:pr-0">
                <div className="relative overflow-hidden rounded-2xl border border-border shadow-[0_12px_34px_rgba(27,42,74,0.1)]">
                  <Image
                    src={src}
                    alt={`Outfit preview ${idx + 1}`}
                    width={1200}
                    height={1600}
                    className="h-[320px] w-full object-cover"
                    priority={idx === 0}
                    unoptimized={uploadedPhotos !== null}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-1.5">
            {photos.map((_, idx) => (
              <span
                key={`dot-${idx}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  activeSlide === idx ? "w-6 bg-primary" : "w-1.5 bg-primary/25"
                )}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          {(analysis
            ? [
                ...analysis.seasons,
                ...analysis.styles.slice(0, 2),
                ...analysis.moods.slice(0, 2),
              ].filter(Boolean)
            : ["맑음 23°C", "Confident", "Work", "Wednesday"]
          ).map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-border bg-white px-3 py-1.5 text-xs text-primary/75"
            >
              {badge}
            </span>
          ))}
        </section>

        <section className="space-y-2 rounded-2xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/50">
            AI Style Note
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-primary/75">
            {analysis && analysis.notes.length > 0
              ? analysis.notes.join("\n\n")
              : "오늘 룩은 미니멀한 테일러링 균형이 좋아 안정감이 높습니다. 내일은 같은 실루엣에 텍스처 대비를 조금 더하면 기록의 다양성이 더 좋아질 수 있어요."}
          </p>
        </section>

        <section className="space-y-2">
          <label
            htmlFor="memo"
            className="text-xs font-medium uppercase tracking-[0.18em] text-primary/50"
          >
            Memo
          </label>
          <input
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={80}
            className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary/35"
          />
        </section>

        <p className="rounded-xl bg-soft px-3 py-2 text-xs text-primary/70">
          내일도 기록하면 2일 연속 스타일 스트릭이 시작돼요.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-md space-y-2">
          <Button
            className="h-11 w-full bg-[#C29A73] text-white hover:bg-[#B18C67]"
            onClick={handleComplete}
            disabled={saving}
          >
            {saving ? "저장 중..." : "기록 완료"}
          </Button>
          <AnimatePresence>
            {saved ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="text-center text-xs text-primary/65"
              >
                저장 완료. 홈으로 이동합니다.
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {saved
          ? Array.from({ length: 18 }).map((_, idx) => (
              <motion.span
                key={`confetti-${idx}`}
                className="absolute h-1.5 w-1.5 rounded-full bg-[#C29A73]/70"
                initial={{
                  x: `${12 + ((idx * 5) % 76)}%`,
                  y: "-8%",
                  opacity: 0,
                }}
                animate={{
                  y: "108%",
                  opacity: [0, 1, 0.2, 0],
                  rotate: [0, 40, -30, 0],
                }}
                transition={{
                  duration: 1.4 + (idx % 5) * 0.22,
                  ease: "easeOut",
                }}
              />
            ))
          : null}
      </div>
    </main>
  );
}
