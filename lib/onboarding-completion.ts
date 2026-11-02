"use client";

import { writeOnboardingLocalState } from "@/lib/onboarding-persistence";
import { writeSurveyDraft } from "@/lib/onboarding-survey-draft";
import { supabase } from "@/lib/supabase";

export async function completeSurveyOnboarding(
  navigate: (path: string) => void,
  skipped = false,
) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) { navigate("/signup"); return; }
  const result = await supabase.auth.updateUser({ data: { onboarding_completed: true } });
  if (result.error) throw result.error;
  writeSurveyDraft({ skipped });
  writeOnboardingLocalState({ completed: true, lastStep: "completed" });
  navigate("/home");
}
