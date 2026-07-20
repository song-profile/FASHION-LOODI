"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OnboardingShell } from "@/components/blocks/onboarding-shell";
import { Button } from "@/components/ui/button";
import { completeSurveyOnboarding } from "@/lib/onboarding-completion";
import { writeOnboardingLocalState } from "@/lib/onboarding-persistence";
import { readSurveyDraft, writeSurveyDraft, type SurveyFit } from "@/lib/onboarding-survey-draft";
import { fitOptions } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function FitOnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<SurveyFit | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  useEffect(() => {
    const loadDraft = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.user_metadata?.onboarding_completed === true) {
        router.replace("/home");
        return;
      }

      const draft = readSurveyDraft();
      setSelected(draft.fit);
      setHydrated(true);
      writeOnboardingLocalState({ lastStep: "survey_fit", completed: false });
    };

    loadDraft();
  }, [router]);

  useEffect(() => {
    if (!hydrated) return;
    writeSurveyDraft({ fit: selected, skipped: false });
  }, [selected, hydrated]);

  const handleNext = () => {
    if (!selected) return;
    completeSurveyOnboarding(router.replace);
  };

  const confirmSkip = () => {
    completeSurveyOnboarding(router.replace, true);
  };

  return (
    <>
      <OnboardingShell
        step={3}
        total={3}
        title="Preferred fit"
        subtitle="Choose one fit profile to improve silhouette and sizing recommendations."
        footer={
          <div className="space-y-2">
            <Button className="h-11 w-full" disabled={!selected} onClick={handleNext}>
              Complete survey
            </Button>
            <p className="text-center text-xs text-primary/55">
              {!selected ? "Choose one fit to continue." : "Great. We will use this as your default fit profile."}
            </p>
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
          {fitOptions.map((fit, index) => {
            const value = fit as SurveyFit;
            const active = selected === value;

            return (
              <motion.button
                key={fit}
                type="button"
                onClick={() => setSelected(value)}
                whileTap={{ scale: 0.985 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.22 }}
                className={cn(
                  "w-full rounded-2xl border px-4 py-4 text-left text-sm font-medium transition-all",
                  active
                    ? "border-primary/20 bg-primary text-white shadow-[0_8px_28px_rgba(27,42,74,0.2)]"
                    : "border-border bg-white text-primary hover:border-primary/20"
                )}
              >
                {fit}
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
                <h2 className="text-lg font-semibold text-primary">Skip survey?</h2>
                <p className="text-sm text-primary/70">
                  You can continue without this and edit preferences later.
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
