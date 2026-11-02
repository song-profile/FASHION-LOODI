import type { DiaryEntry } from "./outfit-diary";
import { scopedLocalStorageKey } from "./user-storage";
export const STYLE_KEYWORDS = [
  {
    label: "Casual",
    tokens: ["캐주얼", "편안", "데일리", "프레피", "워크웨어", "시티보이"],
  },
  {
    label: "Street",
    tokens: ["스트릿", "힙합", "스케이터", "테크웨어", "후드", "오버사이즈"],
  },
  {
    label: "Minimal",
    tokens: ["미니멀", "모던", "톤온톤", "클린", "정제", "심플"],
  },
  {
    label: "Classic",
    tokens: ["클래식", "트래드", "아이비", "테일러드", "단정", "포멀"],
  },
  {
    label: "Sporty",
    tokens: ["스포티", "애슬레저", "러닝", "고프코어", "활동", "기능성"],
  },
  {
    label: "Vintage",
    tokens: ["빈티지", "레트로", "아메카지", "브라운", "데님"],
  },
];

export type RecommendItem = {
  category: string;
  name: string;
  searchKeyword: string;
};

export const RECOMMENDATION_CACHE_KEY = "loodi_today_outfit_recommendation";
export const RECOMMENDATION_CATEGORY_ORDER: Record<string, number> = {
  아우터: 0,
  상의: 1,
  원피스: 2,
  하의: 3,
  신발: 4,
  가방: 5,
  액세서리: 6,
  모자: 7,
};

export type RecommendationState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      reasoning: string;
      colors: string[];
      items: RecommendItem[];
      createdAt: number;
    }
  | { status: "error"; message: string };

export function recommendationErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes("503") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted")
  ) {
    return "AI 추천 서버가 잠시 바쁩니다. 잠깐 후 다시 시도해 주세요.";
  }

  if (message.includes("{") || message.includes("Recommendation failed")) {
    return "오늘 코디 추천을 불러오지 못했어요. 다시 시도해 주세요.";
  }

  return message || "추천을 불러오지 못했어요.";
}

export function todayDateKey() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function sortRecommendationItems(items: RecommendItem[]) {
  return [...items].sort((a, b) => {
    const aOrder = RECOMMENDATION_CATEGORY_ORDER[a.category] ?? 99;
    const bOrder = RECOMMENDATION_CATEGORY_ORDER[b.category] ?? 99;
    return aOrder - bOrder;
  });
}

export function increment(map: Map<string, number>, key: string, amount = 1) {
  const normalized = key.trim();
  if (!normalized) return;
  map.set(normalized, (map.get(normalized) ?? 0) + amount);
}

export function topStyleEntries(map: Map<string, number>, limit = 3) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

export function percentageStyleEntries(entries: Array<[string, number]>) {
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (total <= 0) {
    return entries.map(([style]) => ({ style, percentage: 0 }));
  }

  const calculated = entries.map(([style, count]) => {
    const exact = (count / total) * 100;
    return {
      style,
      percentage: Math.floor(exact),
      remainder: exact % 1,
    };
  });

  let remaining = 100 - calculated.reduce((sum, item) => sum + item.percentage, 0);
  for (const item of [...calculated].sort((a, b) => b.remainder - a.remainder)) {
    if (remaining <= 0) break;
    item.percentage += 1;
    remaining -= 1;
  }

  return calculated.map(({ style, percentage }) => ({ style, percentage }));
}

export function scoreEntryStyles(entry: DiaryEntry) {
  const tags = (entry.tags || []).map(tag => tag.trim().toLowerCase());
  const explicit = new Map<string, number>();
  for (const style of STYLE_KEYWORDS) {
    const names = [style.label, ...style.tokens].map(name => name.toLowerCase());
    const count = tags.filter(tag => names.includes(tag)).length;
    if (count) explicit.set(style.label, count);
  }
  if (explicit.size) return explicit;
  const text = [
    ...(entry.tags ?? []),
    ...(entry.items ?? []).map((item) => item.name),
    entry.styleNote,
    entry.memo,
    entry.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const scores = new Map<string, number>();
  for (const style of STYLE_KEYWORDS) {
    const score = [style.label, ...style.tokens].reduce((sum, token) => {
      return text.includes(token.toLowerCase()) ? sum + 1 : sum;
    }, 0);
    if (score > 0) scores.set(style.label, score);
  }


  return scores;
}

export function dateDaysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

export function diaryDate(entry: DiaryEntry) {
  return new Date(`${entry.date}T00:00:00`);
}

export function formatRelativeTime(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  if (!Number.isFinite(diffMs) || diffMs < 0) return "방금 전";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export function readCachedRecommendation(): RecommendationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(scopedLocalStorageKey(RECOMMENDATION_CACHE_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      date?: string;
      reasoning?: unknown;
      colors?: unknown;
      items?: unknown;
      createdAt?: unknown;
    };
    if (parsed.date !== todayDateKey()) return null;
    if (
      typeof parsed.reasoning !== "string" ||
      !Array.isArray(parsed.colors) ||
      !Array.isArray(parsed.items)
    ) {
      return null;
    }

    return {
      status: "success",
      reasoning: parsed.reasoning,
      colors: parsed.colors.filter((color): color is string => typeof color === "string"),
      createdAt:
        typeof parsed.createdAt === "number" && Number.isFinite(parsed.createdAt)
          ? parsed.createdAt
          : Date.now(),
      items: sortRecommendationItems(
        parsed.items.filter((item): item is RecommendItem => {
          if (!item || typeof item !== "object") return false;
          const value = item as Partial<RecommendItem>;
          return (
            typeof value.category === "string" &&
            typeof value.name === "string" &&
            typeof value.searchKeyword === "string"
          );
        }),
      ),
    };
  } catch {
    return null;
  }
}

export function writeCachedRecommendation(recommendation: Extract<RecommendationState, { status: "success" }>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    scopedLocalStorageKey(RECOMMENDATION_CACHE_KEY),
    JSON.stringify({
      date: todayDateKey(),
      createdAt: recommendation.createdAt,
      reasoning: recommendation.reasoning,
      colors: recommendation.colors,
      items: recommendation.items,
    }),
  );
}

