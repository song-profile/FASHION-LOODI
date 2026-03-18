import { writeOnboardingLocalState } from "@/lib/onboarding-persistence";

export type SurveyFit = "Slim" | "Regular" | "Oversized";

export type SurveyDraft = {
  styles: string[];
  colors: string[];
  fit: SurveyFit | null;
  skipped: boolean;
  updatedAt: number;
};

const SURVEY_DRAFT_KEY = "loodi_onboarding_survey_v1";

const defaultDraft: SurveyDraft = {
  styles: [],
  colors: [],
  fit: null,
  skipped: false,
  updatedAt: 0,
};

export function readSurveyDraft(): SurveyDraft {
  if (typeof window === "undefined") return defaultDraft;
  try {
    const raw = window.localStorage.getItem(SURVEY_DRAFT_KEY);
    if (!raw) return defaultDraft;
    const parsed = JSON.parse(raw) as Partial<SurveyDraft>;
    return {
      styles: Array.isArray(parsed.styles) ? parsed.styles : [],
      colors: Array.isArray(parsed.colors) ? parsed.colors : [],
      fit:
        parsed.fit === "Slim" || parsed.fit === "Regular" || parsed.fit === "Oversized"
          ? parsed.fit
          : null,
      skipped: Boolean(parsed.skipped),
      updatedAt: Number(parsed.updatedAt ?? Date.now()),
    };
  } catch {
    return defaultDraft;
  }
}

export function writeSurveyDraft(patch: Partial<SurveyDraft>) {
  if (typeof window === "undefined") return;
  const current = readSurveyDraft();
  const next: SurveyDraft = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(SURVEY_DRAFT_KEY, JSON.stringify(next));

  writeOnboardingLocalState((state) => ({
    ...state,
    survey: {
      styles: next.styles,
      colors: next.colors,
      fit: next.fit,
      skipped: next.skipped,
    },
  }));
}
