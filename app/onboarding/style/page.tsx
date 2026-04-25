"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OnboardingShell } from "@/components/blocks/onboarding-shell";
import { Button } from "@/components/ui/button";
import { writeOnboardingLocalState } from "@/lib/onboarding-persistence";
import { readSurveyDraft, writeSurveyDraft } from "@/lib/onboarding-survey-draft";
import { cn } from "@/lib/utils";

const styleSurveyOptions = [
  { id: "minimal-luxe", label: "Minimal Luxe", note: "Clean silhouettes, refined neutrals" },
  { id: "quiet-tailoring", label: "Quiet Tailoring", note: "Sharp structure, effortless polish" },
  { id: "soft-street", label: "Soft Street", note: "Relaxed layers with elevated basics" },
  { id: "modern-classic", label: "Modern Classic", note: "Timeless pieces with a current edge" },
  { id: "artful-feminine", label: "Artful Feminine", note: "Delicate textures and expressive detail" },
  { id: "bold-editorial", label: "Bold Editorial", note: "Statement shapes and directional styling" },
];

export default function StyleOnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  useEffect(() => {
    const draft = readSurveyDraft();
    setSelected(draft.styles);
    setHydrated(true);
    writeOnboardingLocalState({ lastStep: "survey_style", completed: false });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeSurveyDraft({ styles: selected, skipped: false });
  }, [selected, hydrated]);

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name]
    );
  };

  const handleNext = () => {
    if (selected.length === 0) return;
    router.push("/onboarding/color");
  };

  const confirmSkip = () => {
    writeSurveyDraft({ skipped: true });
    router.push("/onboarding/upload");
  };

  return (
    <>
      <OnboardingShell
        step={1}
        total={3}
        title="Build your style profile"
        subtitle="Choose at least one style direction. This helps LOODI tune your diary analysis from day one."
        footer={
          <div className="space-y-2">
            <Button className="h-11 w-full" disabled={selected.length === 0} onClick={handleNext}>
              Next
            </Button>
            {selected.length === 0 ? (
              <p className="text-center text-xs text-primary/55">Select at least 1 style to continue.</p>
            ) : (
              <p className="text-center text-xs text-primary/55">You can update this later in Profile Settings.</p>
            )}
            <button
              type="button"
              onClick={() => setShowSkipConfirm(true)}
              className="w-full text-center text-sm text-primary/70 underline underline-offset-4"
            >
              Skip for now
            </button>
          </div>
        }
      >
        <motion.div initial={{ x: 22, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.26, ease: "easeOut" }} className="space-y-3">
          {styleSurveyOptions.map((option, index) => {
            const active = selected.includes(option.id);

            return (
              <motion.button
                key={option.id}
                type="button"
                onClick={() => toggle(option.id)}
                whileTap={{ scale: 0.985 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.22 }}
                className={cn(
                  "w-full rounded-2xl border bg-white/90 px-4 py-4 text-left backdrop-blur-sm transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  active
                    ? "border-primary/20 shadow-[0_8px_28px_rgba(27,42,74,0.12)] ring-1 ring-accent/35"
                    : "border-border/90 hover:border-primary/20 hover:bg-white"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium tracking-tight text-primary">{option.label}</p>
                    <p className="text-xs leading-relaxed text-primary/65">{option.note}</p>
                  </div>
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[10px] font-semibold",
                      active ? "border-primary bg-primary text-white" : "border-border text-transparent"
                    )}
                  >
                    ✓
                  </span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </OnboardingShell>

      <AnimatePresence>
        {showSkipConfirm ? (
          <>
            <motion.button
              type="button"
              aria-label="Close skip confirmation"
              onClick={() => setShowSkipConfirm(false)}
              className="fixed inset-0 z-40 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white px-4 pb-7 pt-5"
            >
              <div className="mx-auto w-full max-w-md space-y-4">
                <h2 className="text-lg font-semibold text-primary">Skip style survey?</h2>
                <p className="text-sm text-primary/70">
                  You can complete this later, but personalization quality may be lower at first.
                </p>
                <Button className="h-11 w-full" onClick={confirmSkip}>Skip survey</Button>
                <Button variant="outline" className="h-11 w-full" onClick={() => setShowSkipConfirm(false)}>
                  Keep answering
                </Button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
