"use client";

import { writeOnboardingLocalState } from "@/lib/onboarding-persistence";
import { writeSurveyDraft } from "@/lib/onboarding-survey-draft";
import { supabase } from "@/lib/supabase";

export async function completeSurveyOnboarding(
  navigate: (path: string) => void,
  skipped = false,
) {
  writeSurveyDraft({ skipped });
  writeOnboardingLocalState({ completed: true, lastStep: "completed" });

  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await supabase.auth.updateUser({
      data: {
        onboarding_completed: true,
      },
    });
  }
  navigate(data.user ? "/home" : "/");
}
