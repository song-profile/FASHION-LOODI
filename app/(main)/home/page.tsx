"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  CalendarDays,
  Flame,
  Trophy,
  RefreshCw,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  computeStreakLevel,
  diaryPhotoToDataUrl,
  readDiaryEntries,
  type DiaryEntry,
  type StreakLevel,
} from "@/lib/outfit-diary";
import { genderToShopping, platformsForGender } from "@/lib/shopping";
import { supabase } from "@/lib/supabase";
import { FashionTipsLoader } from "@/components/blocks/fashion-tips-loader";

const STYLE_KEYWORDS = [
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

type WeatherState =
  | { status: "loading" }
  | {
      status: "success";
      temperature: number;
      icon: string;
      label: string;
      location: string | null;
    }
  | { status: "denied" | "error"; message: string };

function weatherFromCode(code: number) {
  if (code === 0) return { icon: "☀️", label: "Sunny" };
  if (code <= 3) return { icon: "☁️", label: "Cloudy" };
  if ([45, 48].includes(code)) return { icon: "🌫️", label: "Foggy" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { icon: "🌧️", label: "Rainy" };
  }
  if (code >= 71 && code <= 77) return { icon: "❄️", label: "Snowy" };
  if (code >= 95) return { icon: "⛈️", label: "Stormy" };
  return { icon: "🌤️", label: "Weather" };
}

function normalizeLocationName(value: string) {
  const normalized = value
    .replace("서울특별시", "서울시")
    .replace("부산광역시", "부산시")
    .replace("대구광역시", "대구시")
    .replace("인천광역시", "인천시")
    .replace("광주광역시", "광주시")
    .replace("대전광역시", "대전시")
    .replace("울산광역시", "울산시");

  if (normalized === "세종특별자치시") return "세종시";
  return normalized;
}

function cleanLocationPart(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = normalizeLocationName(value.trim());
  if (!cleaned || cleaned === "대한민국" || cleaned === "South Korea") return null;
  return cleaned;
}

function compactLocationParts(parts: Array<string | null>) {
  const cleaned = parts.filter((part): part is string => Boolean(part));
  const unique = Array.from(new Set(cleaned));
  return unique.slice(0, 2).join(" ") || null;
}

function locationLabelFromData(data: unknown) {
  if (!data || typeof data !== "object") return null;

  const record = data as {
    city?: unknown;
    locality?: unknown;
    principalSubdivision?: unknown;
    localityInfo?: {
      administrative?: Array<{
        name?: unknown;
        description?: unknown;
        adminLevel?: unknown;
      }>;
    };
  };

  const administrative = record.localityInfo?.administrative ?? [];
  const administrativeNames = administrative
    .map((item) => cleanLocationPart(item.name))
    .filter((part): part is string => Boolean(part));

  const city =
    cleanLocationPart(record.city) ??
    administrativeNames.find((name) => /(시|군)$/.test(name)) ??
    cleanLocationPart(record.principalSubdivision) ??
    null;
  const district =
    cleanLocationPart(record.locality) ??
    administrativeNames.find((name) => /(구|동|읍|면)$/.test(name)) ??
    null;

  return compactLocationParts([city, district]);
}

function locationLabelFromOsm(data: unknown) {
  if (!data || typeof data !== "object") return null;

  const record = data as {
    address?: Record<string, unknown>;
  };
  const address = record.address;
  if (!address) return null;

  const city =
    cleanLocationPart(address.city) ??
    cleanLocationPart(address.town) ??
    cleanLocationPart(address.county) ??
    cleanLocationPart(address.state);
  const district =
    cleanLocationPart(address.borough) ??
    cleanLocationPart(address.suburb) ??
    cleanLocationPart(address.neighbourhood) ??
    cleanLocationPart(address.quarter);

  return compactLocationParts([city, district]);
}

async function fetchLocationLabel(latitude: number, longitude: number) {
  try {
    const locationParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: "ko",
    });
    const locationResponse = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${locationParams.toString()}`,
    );

    if (locationResponse.ok) {
      const label = locationLabelFromData(await locationResponse.json());
      if (label) return label;
    }
  } catch {
    // Try the OpenStreetMap fallback below.
  }

  try {
    const osmParams = new URLSearchParams({
      format: "jsonv2",
      lat: String(latitude),
      lon: String(longitude),
      zoom: "16",
      addressdetails: "1",
      "accept-language": "ko",
    });
    const osmResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${osmParams.toString()}`,
    );

    if (osmResponse.ok) {
      return locationLabelFromOsm(await osmResponse.json());
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchWeatherForCoordinates(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "weather_code,temperature_2m",
    timezone: "auto",
  });
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  );

  if (!response.ok) throw new Error("weather fetch failed");

  const data = await response.json();
  const temperature = Number(data?.current?.temperature_2m);
  const code = Number(data?.current?.weather_code ?? 1);
  if (!Number.isFinite(temperature)) throw new Error("invalid weather data");
  const condition = weatherFromCode(code);
  const location = await fetchLocationLabel(latitude, longitude);

  return {
    status: "success" as const,
    temperature,
    location,
    ...condition,
  };
}

async function fetchApproximateCoordinates() {
  const response = await fetch("https://ipapi.co/json/");
  if (!response.ok) throw new Error("location fallback failed");

  const data = await response.json();
  const latitude = Number(data?.latitude);
  const longitude = Number(data?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("invalid fallback coordinates");
  }

  const location =
    cleanLocationPart(data?.city) ??
    cleanLocationPart(data?.region) ??
    null;

  return { latitude, longitude, location };
}

type RecommendItem = {
  category: string;
  name: string;
  searchKeyword: string;
};

const RECOMMENDATION_CACHE_KEY = "loodi_today_outfit_recommendation";
const RECOMMENDATION_CATEGORY_ORDER: Record<string, number> = {
  아우터: 0,
  상의: 1,
  원피스: 2,
  하의: 3,
  신발: 4,
  가방: 5,
  액세서리: 6,
  모자: 7,
};

type RecommendationState =
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

function recommendationErrorMessage(message: string) {
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

function todayDateKey() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function sortRecommendationItems(items: RecommendItem[]) {
  return [...items].sort((a, b) => {
    const aOrder = RECOMMENDATION_CATEGORY_ORDER[a.category] ?? 99;
    const bOrder = RECOMMENDATION_CATEGORY_ORDER[b.category] ?? 99;
    return aOrder - bOrder;
  });
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  const normalized = key.trim();
  if (!normalized) return;
  map.set(normalized, (map.get(normalized) ?? 0) + amount);
}

function topStyleEntries(map: Map<string, number>, limit = 3) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function percentageStyleEntries(entries: Array<[string, number]>) {
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

function scoreEntryStyles(entry: DiaryEntry) {
  const text = [
    ...(entry.tags ?? []),
    ...(entry.colors ?? []),
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
    const score = style.tokens.reduce((sum, token) => {
      return text.includes(token.toLowerCase()) ? sum + 1 : sum;
    }, 0);
    if (score > 0) scores.set(style.label, score);
  }

  if (scores.size === 0 && entry.tags?.length) {
    increment(scores, entry.tags[0]);
  }

  return scores;
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function diaryDate(entry: DiaryEntry) {
  return new Date(`${entry.date}T00:00:00`);
}

function formatRelativeTime(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  if (!Number.isFinite(diffMs) || diffMs < 0) return "방금 전";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function readCachedRecommendation(): RecommendationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RECOMMENDATION_CACHE_KEY);
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

function writeCachedRecommendation(recommendation: Extract<RecommendationState, { status: "success" }>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    RECOMMENDATION_CACHE_KEY,
    JSON.stringify({
      date: todayDateKey(),
      createdAt: recommendation.createdAt,
      reasoning: recommendation.reasoning,
      colors: recommendation.colors,
      items: recommendation.items,
    }),
  );
}

export default function HomeTabPage() {
  const [weather, setWeather] = useState<WeatherState>({ status: "loading" });
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [recentEntries, setRecentEntries] = useState<DiaryEntry[]>([]);
  const [streakLevel, setStreakLevel] = useState<StreakLevel | null>(null);
  const [gender, setGender] = useState<string>("선택 안 함");
  const [recommendation, setRecommendation] = useState<RecommendationState>({
    status: "idle",
  });

  useEffect(() => {
    const loadApproximateWeather = async () => {
      try {
        const { latitude, longitude, location } = await fetchApproximateCoordinates();
        const approximateWeather = await fetchWeatherForCoordinates(latitude, longitude);
        setWeather({
          ...approximateWeather,
          location: approximateWeather.location ?? location,
        });
      } catch {
        setWeather({
          status: "error",
          message: "Weather: 위치 권한을 허용하면 더 정확히 잡을 수 있어요",
        });
      }
    };

    if (!navigator.geolocation) {
      loadApproximateWeather();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setWeather(await fetchWeatherForCoordinates(latitude, longitude));
        } catch {
          setWeather({
            status: "error",
            message: "Weather: 날씨를 불러오지 못했어요",
          });
        }
      },
      () => {
        loadApproximateWeather();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60 * 1000 }
    );
  }, []);

  useEffect(() => {
    const loadRecentEntries = () => {
      const all = readDiaryEntries();
      setDiaryEntries(all);
      setRecentEntries(all.filter((entry) => entry.photos[0]).slice(0, 3));
      setStreakLevel(computeStreakLevel(all));
    };

    loadRecentEntries();
    window.addEventListener("focus", loadRecentEntries);
    return () => window.removeEventListener("focus", loadRecentEntries);
  }, []);

  useEffect(() => {
    const loadGender = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const value = data.user?.user_metadata?.gender;
        if (typeof value === "string" && value.trim().length > 0) {
          setGender(value);
        }
      } catch {
        // ignore: stay with default "선택 안 함"
      }
    };
    loadGender();
  }, []);

  useEffect(() => {
    const cached = readCachedRecommendation();
    if (cached) setRecommendation(cached);
  }, []);

  const fetchRecommendation = useCallback(async () => {
    setRecommendation({ status: "loading" });
    try {
      const all = readDiaryEntries();
      const todayKey = todayDateKey();

      const todayEntry = all.find((entry) => entry.date === todayKey && entry.photos[0]);
      const recent = all
        .filter((entry) => entry.date !== todayKey)
        .slice(0, 10)
        .map((entry) => ({
          date: entry.date,
          colors: entry.colors,
          items: entry.items,
          styleNote: entry.styleNote,
          mood: entry.mood,
          weather: entry.weather,
        }));

      const weatherPayload =
        weather.status === "success"
          ? { label: weather.label, temperature: weather.temperature }
          : null;

      const todayPhoto = todayEntry?.photos[0]
        ? {
            base64: todayEntry.photos[0].base64,
            mediaType: todayEntry.photos[0].mediaType,
          }
        : null;

      const response = await fetch("/api/recommend-outfit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gender,
          weather: weatherPayload,
          recentEntries: recent,
          todayPhoto,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? `요청 실패 (${response.status})`);
      }

      const data = (await response.json()) as {
        reasoning: string;
        recommendedColors: string[];
        recommendedItems: RecommendItem[];
      };

      const nextRecommendation: RecommendationState = {
        status: "success",
        reasoning: data.reasoning,
        colors: data.recommendedColors,
        items: sortRecommendationItems(data.recommendedItems),
        createdAt: Date.now(),
      };
      setRecommendation(nextRecommendation);
      writeCachedRecommendation(nextRecommendation);
    } catch (err) {
      const message = recommendationErrorMessage(
        err instanceof Error ? err.message : "추천을 불러오지 못했어요.",
      );
      setRecommendation({ status: "error", message });
    }
  }, [gender, weather]);

  useEffect(() => {
    if (weather.status === "loading") return;
    if (recommendation.status !== "idle") return;
    const cached = readCachedRecommendation();
    if (cached) {
      setRecommendation(cached);
      return;
    }
    fetchRecommendation();
  }, [weather.status, recommendation.status, fetchRecommendation]);

  const shoppingGender = genderToShopping(gender);
  const shoppingPlatforms = platformsForGender(shoppingGender);
  const styleInsight = useMemo(() => {
    const recentCutoff = dateDaysAgo(6);
    const previousCutoff = dateDaysAgo(13);
    const photoEntries = diaryEntries.filter((entry) => entry.photos.length > 0);
    const recentPhotoEntries = photoEntries.filter((entry) => diaryDate(entry) >= recentCutoff);
    const previousPhotoEntries = photoEntries.filter((entry) => {
      const date = diaryDate(entry);
      return date >= previousCutoff && date < recentCutoff;
    });

    const recentScores = new Map<string, number>();
    for (const entry of recentPhotoEntries) {
      for (const [style, score] of scoreEntryStyles(entry)) {
        increment(recentScores, style, score);
      }
    }

    const previousScores = new Map<string, number>();
    for (const entry of previousPhotoEntries) {
      for (const [style, score] of scoreEntryStyles(entry)) {
        increment(previousScores, style, score);
      }
    }

    const styles = topStyleEntries(recentScores);
    const topStyle = styles[0];
    const previousTopScore = topStyle ? previousScores.get(topStyle[0]) ?? 0 : 0;
    const trend =
      topStyle && topStyle[1] > previousTopScore
        ? "↑"
        : topStyle && topStyle[1] < previousTopScore
          ? "↓"
          : "→";

    return {
      entryCount: recentPhotoEntries.length,
      styles: percentageStyleEntries(styles),
      topLabel: topStyle?.[0] ?? null,
      trend,
    };
  }, [diaryEntries]);

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-white shadow-soft">
            <Sparkles size={18} />
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-primary">LOODI</h1>
        </div>
        {streakLevel ? (
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 border border-highlight/15 bg-white text-primary">
              <Flame size={13} className="text-highlight" />
              {streakLevel.streak} Day Streak
            </Badge>
            <Badge className="gap-1 bg-highlight text-white">
              <Trophy size={13} />
              Level {streakLevel.level}
            </Badge>
          </div>
        ) : null}
      </header>

      {streakLevel ? (
        <Card className="border-highlight/15 bg-white">
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-primary/55">
                  현재 혜택
                </p>
                <p className="text-sm font-semibold text-primary">{streakLevel.perks.current}</p>
              </div>
              <Trophy size={20} className="flex-shrink-0 text-highlight" />
            </div>
            {streakLevel.remaining > 0 ? (
              <>
                <div className="h-1.5 overflow-hidden rounded-full bg-soft">
                  <div
                    className="h-full rounded-full bg-highlight transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (streakLevel.totalEntries / Math.max(1, streakLevel.nextLevelAt)) * 100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-primary/70">
                  <span className="font-semibold text-accent">{streakLevel.remaining}일</span> 더
                  기록하면 Level {streakLevel.level + 1} 해제 →{" "}
                  <span className="font-medium text-primary">{streakLevel.perks.next}</span>
                </p>
              </>
            ) : (
              <p className="text-xs text-primary/70">최고 레벨 달성! 새로운 혜택을 준비 중이에요.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Today Outfit Recommendation</CardTitle>
          <button
            type="button"
            onClick={fetchRecommendation}
            disabled={recommendation.status === "loading"}
            className="flex h-8 w-8 items-center justify-center rounded-full text-primary/60 hover:text-primary disabled:opacity-50"
            aria-label="다시 추천 받기"
          >
            <RefreshCw
              size={14}
              className={recommendation.status === "loading" ? "animate-spin" : ""}
            />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-primary/70">
            {weather.status === "loading"
              ? "Weather: 현재 위치 확인 중..."
              : weather.status === "success"
                ? `Weather: ${Math.round(weather.temperature)}°C ${weather.icon}${
                    weather.location ? ` · ${weather.location}` : ""
                  }`
                : weather.message}
          </p>

          {recommendation.status === "loading" || recommendation.status === "idle" ? (
            <div className="space-y-2">
              <div className="rounded-2xl bg-soft p-4 text-sm text-primary/70">
                오늘 어울릴 코디를 분석 중...
              </div>
              <FashionTipsLoader />
            </div>
          ) : recommendation.status === "error" ? (
            <div className="rounded-2xl bg-soft p-4 text-sm text-primary/70">
              <p>{recommendation.message}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={fetchRecommendation}
              >
                다시 시도
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl bg-soft p-4 text-sm text-primary">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">왜 이 코디?</p>
                  <p className="shrink-0 text-xs text-primary/45">
                    {formatRelativeTime(recommendation.createdAt)}
                  </p>
                </div>
                <p className="mt-1 text-primary/75">{recommendation.reasoning}</p>
                {recommendation.colors.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {recommendation.colors.map((color) => (
                      <Badge key={color} className="bg-white text-[11px]">
                        {color}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                {recommendation.items.map((item, idx) => (
                  <div
                    key={`${item.category}-${idx}`}
                    className="rounded-2xl border border-border bg-white px-4 py-3"
                  >
                    <p className="text-[11px] font-medium text-primary/55">
                      {item.category}
                    </p>
                    <p className="truncate text-sm font-medium text-primary">
                      {item.name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {shoppingPlatforms.map((platform) => (
                        <a
                          key={platform.id}
                          href={platform.buildUrl(item.searchKeyword, shoppingGender)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-soft px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-accent hover:text-white"
                        >
                          {platform.label}
                          <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Style Insight</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl bg-soft p-4 text-sm">
            <p className="text-primary/60">
              Last 7 Days · 사진 기록 {styleInsight.entryCount}개
            </p>
            {styleInsight.entryCount === 0 ? (
              <p className="mt-1 font-medium text-primary">
                아직 기록된 사진이 없어요
              </p>
            ) : styleInsight.topLabel ? (
              <div className="mt-2 space-y-2">
                <p className="font-medium text-primary">
                  {styleInsight.topLabel} {styleInsight.trend}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {styleInsight.styles.map(({ style, percentage }) => (
                    <Badge key={style} className="bg-white text-[11px]">
                      {style} {percentage}%
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-1 font-medium text-primary">
                사진은 있지만 분석 데이터가 아직 부족해요
              </p>
            )}
          </div>
          <Link href="/dna"><Button variant="outline" className="w-full gap-2"><Sparkles size={16} /> View Style DNA</Button></Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent Outfits</CardTitle>
          <Link href="/timeline" className="text-xs text-accent">View Timeline</Link>
        </CardHeader>
        <CardContent>
          {recentEntries.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {recentEntries.map((entry) => {
                const photo = entry.photos[0];
                return (
                  <Link
                    key={entry.id}
                    href="/timeline"
                    className="relative h-24 overflow-hidden rounded-xl"
                  >
                    <Image
                      src={diaryPhotoToDataUrl(photo)}
                      alt={entry.title ?? `outfit ${entry.date}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-primary/55">
              아직 기록한 사진이 없어요. Record에서 첫 룩을 저장해 보세요.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-soft">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium text-primary">Reminder</p>
            <p className="text-xs text-primary/70">Did you record your outfit today?</p>
          </div>
          <CalendarDays size={18} className="text-accent" />
        </CardContent>
      </Card>
    </div>
  );
}
