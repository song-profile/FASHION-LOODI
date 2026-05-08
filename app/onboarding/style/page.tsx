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
  {
    id: "casual",
    label: "Casual",
    note: "일상적이고 편안한 무드",
    substyles: ["아메카지", "시티보이", "프레피", "워크웨어", "빈티지"],
  },
  {
    id: "street",
    label: "Street",
    note: "자유롭고 강한 개성",
    substyles: ["스트릿", "힙합", "스케이터", "테크웨어"],
  },
  {
    id: "minimal",
    label: "Minimal",
    note: "정제된 실루엣과 절제된 톤",
    substyles: ["미니멀", "모던", "톤온톤", "클린핏"],
  },
  {
    id: "classic",
    label: "Classic",
    note: "단정하고 타임리스한 스타일",
    substyles: ["클래식", "트래드", "아이비", "테일러드"],
  },
  {
    id: "sporty",
    label: "Sporty",
    note: "활동감 있는 기능성 중심",
    substyles: ["애슬레저", "러닝", "고프코어", "스포티"],
  },
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

  const toggleStyle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name]
    );
  };

  const toggleCategory = (option: (typeof styleSurveyOptions)[number]) => {
    setSelected((prev) => {
      const active = prev.includes(option.id);
      if (active) {
        const removeSet = new Set([option.id, ...option.substyles]);
        return prev.filter((value) => !removeSet.has(value));
      }
      return [...prev, option.id];
    });
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
              <motion.div
                key={option.id}
                role="button"
                tabIndex={0}
                onClick={() => toggleCategory(option)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  toggleCategory(option);
                }}
                whileTap={{ scale: 0.985 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.22 }}
                className={cn(
                  "w-full cursor-pointer rounded-3xl border bg-card/90 px-4 py-4 text-left backdrop-blur-sm transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  active
                    ? "border-accent/45 shadow-[0_10px_32px_rgba(80,50,130,0.14)] ring-1 ring-accent/30"
                    : "border-border/90 hover:border-accent/25 hover:bg-card"
                )}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-base font-semibold tracking-tight text-primary">
                        {option.label}
                      </p>
                      <p className="text-sm leading-relaxed text-primary/65">
                        {option.note}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border text-xs font-semibold",
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-border text-transparent"
                      )}
                    >
                      ✓
                    </span>
                  </div>

                  {active ? (
                    <>
                      <div className="h-px bg-border" />
                      <div className="flex flex-wrap gap-1.5">
                        {option.substyles.map((substyle) => {
                          const subActive = selected.includes(substyle);
                          return (
                            <span
                              key={substyle}
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleStyle(substyle);
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== "Enter" && event.key !== " ") return;
                                event.preventDefault();
                                event.stopPropagation();
                                toggleStyle(substyle);
                              }}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                                subActive
                                  ? "border-primary bg-primary text-white"
                                  : "border-border bg-card text-primary/70 hover:border-accent/35"
                              )}
                            >
                              {substyle}
                            </span>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </div>
              </motion.div>
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
