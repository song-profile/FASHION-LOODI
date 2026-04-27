export type OnboardingStepId =
  | "welcome"
  | "survey_style"
  | "survey_color"
  | "survey_fit"
  | "upload"
  | "analysis_loading"
  | "analysis_result"
  | "completed";

export type UploadDraft = {
  photoCount: number;
  emotions: string[];
  tpo: string[];
  weatherTag: string | null;
  memo: string;
};

export type OnboardingLocalState = {
  version: 1;
  updatedAt: number;
  completed: boolean;
  lastStep: OnboardingStepId;
  survey: {
    styles: string[];
    colors: string[];
    fit: "Slim" | "Regular" | "Oversized" | "No preference" | null;
    skipped: boolean;
  };
  upload: UploadDraft;
};

const KEY = "loodi_onboarding_local_v1";
const STALE_MS = 1000 * 60 * 60 * 24 * 14;

const defaultState: OnboardingLocalState = {
  version: 1,
  updatedAt: 0,
  completed: false,
  lastStep: "welcome",
  survey: {
    styles: [],
    colors: [],
    fit: null,
    skipped: false,
  },
  upload: {
    photoCount: 0,
    emotions: [],
    tpo: [],
    weatherTag: null,
    memo: "",
  },
};

export function readOnboardingLocalState(): OnboardingLocalState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<OnboardingLocalState>;
    return {
      version: 1,
      updatedAt: Number(parsed.updatedAt ?? 0),
      completed: Boolean(parsed.completed),
      lastStep:
        parsed.lastStep &&
        [
          "welcome",
          "survey_style",
          "survey_color",
          "survey_fit",
          "upload",
          "analysis_loading",
          "analysis_result",
          "completed",
        ].includes(parsed.lastStep)
          ? (parsed.lastStep as OnboardingStepId)
          : "welcome",
      survey: {
        styles: Array.isArray(parsed.survey?.styles) ? parsed.survey!.styles : [],
        colors: Array.isArray(parsed.survey?.colors) ? parsed.survey!.colors : [],
        fit:
          parsed.survey?.fit === "Slim" ||
          parsed.survey?.fit === "Regular" ||
          parsed.survey?.fit === "Oversized" ||
          parsed.survey?.fit === "No preference"
            ? parsed.survey.fit
            : null,
        skipped: Boolean(parsed.survey?.skipped),
      },
      upload: {
        photoCount: Number(parsed.upload?.photoCount ?? 0),
        emotions: Array.isArray(parsed.upload?.emotions) ? parsed.upload!.emotions : [],
        tpo: Array.isArray(parsed.upload?.tpo) ? parsed.upload!.tpo : [],
        weatherTag:
          typeof parsed.upload?.weatherTag === "string"
            ? parsed.upload.weatherTag
            : null,
        memo: typeof parsed.upload?.memo === "string" ? parsed.upload.memo : "",
      },
    };
  } catch {
    return defaultState;
  }
}

export function writeOnboardingLocalState(
  patch:
    | Partial<OnboardingLocalState>
    | ((current: OnboardingLocalState) => OnboardingLocalState)
) {
  if (typeof window === "undefined") return;
  const current = readOnboardingLocalState();
  const next =
    typeof patch === "function"
      ? patch(current)
      : ({ ...current, ...patch } as OnboardingLocalState);
  next.updatedAt = Date.now();
  next.version = 1;
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearOnboardingLocalState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function isOnboardingStateStale(state: OnboardingLocalState) {
  if (!state.updatedAt) return false;
  return Date.now() - state.updatedAt > STALE_MS;
}

export function stepToRoute(step: OnboardingStepId) {
  switch (step) {
    case "survey_style":
      return "/onboarding/style";
    case "survey_color":
      return "/onboarding/color";
    case "survey_fit":
      return "/onboarding/fit";
    case "upload":
      return "/onboarding/upload";
    case "analysis_loading":
      return "/onboarding/analysis/loading";
    case "analysis_result":
      return "/onboarding/analysis/result";
    case "completed":
      return "/home";
    case "welcome":
    default:
      return "/";
  }
}
