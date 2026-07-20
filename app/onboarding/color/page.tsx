"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OnboardingShell } from "@/components/blocks/onboarding-shell";
import { Button } from "@/components/ui/button";
import { completeSurveyOnboarding } from "@/lib/onboarding-completion";
import { writeOnboardingLocalState } from "@/lib/onboarding-persistence";
import { readSurveyDraft, writeSurveyDraft } from "@/lib/onboarding-survey-draft";
import { colorOptions } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const MAX_COLORS = 3;
const PRIMARY_COLOR_NAMES = [
  "Black",
  "White",
  "Gray",
  "Navy",
  "Brown",
  "Red",
  "Green",
  "Blue",
  "Beige",
  "Ivory",
];
const primaryColors = PRIMARY_COLOR_NAMES.map((name) =>
  colorOptions.find((color) => color.name === name),
).filter((color): color is (typeof colorOptions)[number] => Boolean(color));
const otherColors = colorOptions.filter(
  (color) => !PRIMARY_COLOR_NAMES.includes(color.name),
);

export default function ColorOnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showOtherColors, setShowOtherColors] = useState(false);
  const [limitError, setLimitError] = useState(false);

  useEffect(() => {
    const loadDraft = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.user_metadata?.onboarding_completed === true) {
        router.replace("/home");
        return;
      }

      const draft = readSurveyDraft();
      setSelected(draft.colors);
      setHydrated(true);
      writeOnboardingLocalState({ lastStep: "survey_color", completed: false });
    };

    loadDraft();
  }, [router]);

  useEffect(() => {
    if (!hydrated) return;
    writeSurveyDraft({ colors: selected, skipped: false });
  }, [selected, hydrated]);

  useEffect(() => {
    if (!limitError) return;
    const timer = window.setTimeout(() => setLimitError(false), 1800);
    return () => window.clearTimeout(timer);
  }, [limitError]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((v) => v !== name);
      if (prev.length >= MAX_COLORS) {
        setLimitError(true);
        return prev;
      }
      return [...prev, name];
    });
  };

  const handleNext = () => {
    if (selected.length === 0) return;
    router.push("/onboarding/fit");
  };

  const confirmSkip = () => {
    completeSurveyOnboarding(router.replace, true);
  };

  return (
    <>
      <OnboardingShell
        step={2}
        total={3}
        title="Color preferences"
        subtitle="Choose up to 3 colors you reach for most often."
        footer={
          <div className="space-y-2">
            <Button className="h-11 w-full" disabled={selected.length === 0} onClick={handleNext}>
              Next
            </Button>
            <p className="text-center text-xs text-primary/55">
              {selected.length === 0
                ? "Select at least 1 color to continue."
                : limitError
                  ? "You can select up to 3 colors."
                  : `${selected.length}/${MAX_COLORS} selected`}
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
        <motion.div initial={{ x: 22, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.26, ease: "easeOut" }} className="grid grid-cols-2 gap-3">
          {primaryColors.map((color, index) => {
            const active = selected.includes(color.name);
            const capped = !active && selected.length >= MAX_COLORS;

            return (
              <motion.button
                key={color.name}
                type="button"
                onClick={() => toggle(color.name)}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.22 }}
                className={cn(
                  "flex min-h-20 items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-all",
                  active
                    ? "border-accent/45 ring-1 ring-accent/35 shadow-[0_8px_28px_rgba(80,50,130,0.14)]"
                    : "border-border",
                  capped && "opacity-55"
                )}
              >
                <span
                  className="h-8 w-8 rounded-full border border-border shadow-sm"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-base font-semibold text-primary">{color.name}</span>
              </motion.button>
            );
          })}

          <motion.button
            type="button"
            onClick={() => setShowOtherColors((prev) => !prev)}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: primaryColors.length * 0.03, duration: 0.22 }}
            className="col-span-2 flex min-h-20 items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 text-primary transition hover:border-accent/45"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">
              +
            </span>
            <span className="text-base font-semibold">기타 색상</span>
          </motion.button>

          {showOtherColors ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-2 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-soft p-3"
            >
              {otherColors.map((color) => {
                const active = selected.includes(color.name);
                const capped = !active && selected.length >= MAX_COLORS;

                return (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => toggle(color.name)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left transition",
                      active
                        ? "border-accent/45 ring-1 ring-accent/35"
                        : "border-border",
                      capped && "opacity-55",
                    )}
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-border"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="truncate text-xs font-medium text-primary">
                      {color.name}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          ) : null}
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
