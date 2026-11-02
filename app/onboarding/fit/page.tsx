"use client";
import { useDialog } from "@/hooks/use-dialog";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OnboardingShell } from "@/components/blocks/onboarding-shell";
import { Button } from "@/components/ui/button";
import { useCompleteOnboarding } from "@/hooks/use-complete-onboarding";
import { writeOnboardingLocalState } from "@/lib/onboarding-persistence";
import { readSurveyDraft, writeSurveyDraft, type SurveyFit } from "@/lib/onboarding-survey-draft";
import { fitOptions } from "@/lib/onboarding-options";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function FitOnboardingPage() {
  const router = useRouter();
  const { complete, completing, completionError } = useCompleteOnboarding();
  const [selected, setSelected] = useState<SurveyFit | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const dialogRef = useDialog(showSkipConfirm, () => setShowSkipConfirm(false));

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
    void complete();
  };

  const confirmSkip = () => {
    void complete(true);
  };

  return (
    <>
      <OnboardingShell
        step={3}
        total={3}
        title="어떤 핏이 편한가요?"
        subtitle="평소 즐겨 입는 핏을 골라주세요."
        footer={
          <div className="space-y-2">
            {completionError ? <p role="alert" className="text-sm text-destructive">{completionError}</p> : null}
            <Button className="h-11 w-full" disabled={!selected || completing} onClick={handleNext}>
              {completing ? "저장 중…" : "내 스타일로 시작하기"}
            </Button>
            <p className="text-center text-xs text-primary/55">
              {!selected ? "편한 핏 한 가지를 선택해 주세요." : "선택한 핏을 코디 추천에 참고할게요."}
            </p>
            <button
              type="button"
              onClick={() => setShowSkipConfirm(true)}
              className="flex min-h-11 w-full items-center justify-center text-center text-sm text-primary/70 underline underline-offset-4"
            >
              나중에 설정하기
            </button>
          </div>
        }
      >
        <motion.div initial={false} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.26, ease: "easeOut" }} className="space-y-3">
          {fitOptions.map((fit, index) => {
            const value = fit as SurveyFit;
            const active = selected === value;

            return (
              <motion.button
                key={fit}
                type="button"
                onClick={() => setSelected(value)}
                whileTap={{ scale: 0.985 }}
                initial={false}
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
            <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-label="설문 건너뛰기" tabIndex={-1}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white px-4 pb-7 pt-5"
            >
              <div className="mx-auto w-full max-w-md space-y-4">
                <h2 className="text-lg font-semibold text-primary">지금은 건너뛸까요?</h2>
                <p className="text-sm text-primary/70">
                  취향은 나중에도 바꿀 수 있어요.
                </p>
                {completionError ? <p role="alert" className="text-sm text-destructive">{completionError}</p> : null}
                <Button className="h-11 w-full" disabled={completing} onClick={confirmSkip}>{completing ? "저장 중…" : "건너뛰기"}</Button>
                <Button variant="outline" className="h-11 w-full" onClick={() => setShowSkipConfirm(false)}>
                  계속 선택하기
                </Button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
